"""Connection session: adb + scrcpy-server + sockets + decoding."""

from __future__ import annotations

import os
import random
import socket
import struct
import subprocess
import threading
import time
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Deque, Optional, Tuple

import numpy as np
from PySide6.QtCore import QObject, Signal
from PySide6.QtGui import QImage

from . import protocol
from .adb import Adb, AdbError
from .decoder import H264Decoder

SCRCPY_VERSION = "5.0.1"
SERVER_REMOTE = "/data/local/tmp/scrcpy-server.jar"


@dataclass
class MirrorSettings:
    max_size: int = 1080
    bitrate: int = 8_000_000
    max_fps: int = 60
    video_codec: str = "h264"
    stay_awake: bool = False
    show_touches: bool = False
    control: bool = True
    raw_stream: bool = False


def _recv_exact(sock: socket.socket, n: int) -> bytes:
    """Read exactly ``n`` bytes, or raise on EOF."""
    buf = bytearray()
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("koneksi ditutup oleh perangkat")
        buf += chunk
    return bytes(buf)


class Session(QObject):
    """Owns the whole mirroring pipeline for one device."""

    frame_ready = Signal(object)          # QImage
    resolution_changed = Signal(int, int)  # video width, height
    device_name = Signal(str)
    state_changed = Signal(str)            # connecting|connected|disconnected|error
    error = Signal(str)
    clipboard_received = Signal(str)
    stats_updated = Signal(str)

    def __init__(self, adb: Adb, parent=None):
        super().__init__(parent)
        self._adb = adb
        self.settings = MirrorSettings()

        self._serial: Optional[str] = None
        self._scid = random.randint(1, 0x7FFFFFFF)
        self._port = 0

        self._listener: Optional[socket.socket] = None
        self._video_sock: Optional[socket.socket] = None
        self._control_sock: Optional[socket.socket] = None
        self._server_proc: Optional[subprocess.Popen] = None

        self._running = False
        self._decoder = H264Decoder()

        self._dev_w = 0
        self._dev_h = 0
        self._vid_w = 0
        self._vid_h = 0

        self._send_lock = threading.Lock()
        self._send_queue: Deque[bytes] = deque()
        self._send_event = threading.Event()

        self._frames = 0
        self._last_fps_time = time.time()
        self._fps = 0

    # ------------------------------------------------------------- state
    @property
    def connected(self) -> bool:
        return self._running

    @property
    def serial(self) -> Optional[str]:
        return self._serial

    @property
    def device_size(self) -> Tuple[int, int]:
        return (self._dev_w, self._dev_h)

    @property
    def video_size(self) -> Tuple[int, int]:
        return (self._vid_w, self._vid_h)

    # ------------------------------------------------------------ control
    def send(self, payload: bytes) -> None:
        """Queue a control message (thread-safe)."""
        if not self._running or self._control_sock is None:
            return
        with self._send_lock:
            self._send_queue.append(payload)
        self._send_event.set()

    # ------------------------------------------------------------- start
    def start(self, serial: str, settings: Optional[MirrorSettings] = None) -> None:
        if self._running:
            self.stop()
        if settings is not None:
            self.settings = settings
        self._serial = serial
        self.state_changed.emit("connecting")
        try:
            self._setup()
            self.state_changed.emit("connected")
        except Exception as exc:  # noqa: BLE001
            self.error.emit(str(exc))
            self.stop()

    def _setup(self) -> None:
        self._adb.ensure_server()

        devices = self._adb.devices()
        if not any(d.serial == self._serial and d.ready for d in devices):
            raise AdbError(f"perangkat {self._serial} tidak siap. Aktifkan USB debugging?")

        self._dev_w, self._dev_h = self._adb.screen_size(self._serial)
        if not self._dev_w:
            raise AdbError("gagal membaca ukuran layar perangkat")

        server_path = str(Path(__file__).resolve().parent.parent / "bin" / "scrcpy-server")

        # 1. listen on a free port first (reverse tunnel -> device connects to us)
        self._listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._listener.bind(("127.0.0.1", 0))
        self._listener.listen(3)
        self._listener.settimeout(40)
        self._port = self._listener.getsockname()[1]

        # 2. set up the adb reverse tunnel
        self._adb.reverse(self._serial, f"localabstract:scrcpy_{self._scid:08x}", self._port)

        # 3. push the server
        try:
            self._adb.push(self._serial, server_path, SERVER_REMOTE)
        except AdbError as exc:
            raise AdbError(f"gagal mengirim server: {exc}") from exc

        # 4. start the server
        args = self._build_server_args()
        self._server_proc = subprocess.Popen(
            [self._adb.path, "-s", self._serial, "shell", args],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # 5. accept the video socket, then the control socket
        try:
            self._video_sock, _ = self._listener.accept()
            self._video_sock.settimeout(None)
        except socket.timeout as exc:
            raise AdbError(
                "perangkat tidak tersambung (timeout). Cek USB debugging / izinkan dialog di HP."
            ) from exc

        if self.settings.control:
            try:
                self._control_sock, _ = self._listener.accept()
                self._control_sock.settimeout(None)
            except socket.timeout:
                self._control_sock = None
        else:
            self._control_sock = None

        # 6. read the 64-byte device name blob
        try:
            blob = _recv_exact(self._video_sock, protocol.DEVICE_NAME_LEN)
            name = blob.split(b"\x00", 1)[0].decode("utf-8", "replace")
            self.device_name.emit(name or self._serial)
        except (ConnectionError, OSError):
            pass

        # 7. go
        self._running = True
        threading.Thread(target=self._video_loop, name="video", daemon=True).start()
        if self._control_sock is not None:
            threading.Thread(target=self._control_read_loop, name="control-read", daemon=True).start()
            threading.Thread(target=self._control_write_loop, name="control-write", daemon=True).start()

    def _build_server_args(self) -> str:
        s = self.settings
        parts = [
            f"CLASSPATH={SERVER_REMOTE}",
            "app_process",
            "/",
            "com.genymobile.scrcpy.Server",
            SCRCPY_VERSION,
            f"scid={self._scid}",
            "log_level=warn",
            "video=true",
            "audio=false",
            f"control={'true' if s.control else 'false'}",
            f"max_size={s.max_size}",
            f"video_bit_rate={s.bitrate}",
            f"max_fps={s.max_fps}",
            f"video_codec={s.video_codec}",
            f"stay_awake={'true' if s.stay_awake else 'false'}",
            f"show_touches={'true' if s.show_touches else 'false'}",
            "tunnel_forward=false",
            "cleanup=true",
        ]
        if s.raw_stream:
            parts.append("raw_stream=true")
        return " ".join(parts)

    # -------------------------------------------------------------- stop
    def stop(self) -> None:
        self._running = False
        self._send_event.set()

        for sock in (self._video_sock, self._control_sock):
            if sock is not None:
                try:
                    sock.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
                try:
                    sock.close()
                except OSError:
                    pass
        self._video_sock = None
        self._control_sock = None

        if self._server_proc is not None:
            try:
                self._server_proc.terminate()
            except Exception:
                pass
            self._server_proc = None

        if self._listener is not None:
            try:
                self._listener.close()
            except OSError:
                pass
            self._listener = None

        if self._serial:
            try:
                self._adb.remove_reverse(self._serial, f"localabstract:scrcpy_{self._scid:08x}")
            except AdbError:
                pass

        self._decoder = H264Decoder()
        self._vid_w = self._vid_h = 0
        self.state_changed.emit("disconnected")

    # ------------------------------------------------------------ video
    def _video_loop(self) -> None:
        sock = self._video_sock
        if sock is None:
            return

        try:
            if not self.settings.raw_stream:
                codec = _recv_exact(sock, 4)
                if codec not in (b"h264", b"h265", b"av1", b"vp8", b"vp9"):
                    raise AdbError(f"codec tidak didukung: {codec!r}")

            while self._running:
                if self.settings.raw_stream:
                    chunk = sock.recv(65536)
                    if not chunk:
                        break
                    self._feed(chunk)
                    continue

                header = _recv_exact(sock, 12)
                first = header[0]
                if first & 0x80:
                    # session packet -> new capture session (resolution change)
                    self._vid_w = int.from_bytes(header[4:8], "big")
                    self._vid_h = int.from_bytes(header[8:12], "big")
                    if self._vid_w:
                        self.resolution_changed.emit(self._vid_w, self._vid_h)
                else:
                    size = int.from_bytes(header[8:12], "big")
                    if size <= 0:
                        continue
                    payload = _recv_exact(sock, size)
                    self._feed(payload)

        except (ConnectionError, OSError):
            pass
        except Exception as exc:  # noqa: BLE001
            if self._running:
                self.error.emit(str(exc))
        finally:
            if self._running:
                self.state_changed.emit("disconnected")
                self._running = False

    def _feed(self, payload: bytes) -> None:
        frames = self._decoder.decode(payload)
        for frame in frames:
            self._frames += 1
            now = time.time()
            if now - self._last_fps_time >= 1.0:
                self._fps = self._frames
                self._frames = 0
                self._last_fps_time = now
                self.stats_updated.emit(str(self._fps))

            try:
                arr = frame.to_ndarray(format="rgb24")
                h, w, _ = arr.shape
                qimg = QImage(arr.data, w, h, 3 * w, QImage.Format.Format_RGB888).copy()
            except Exception:
                continue
            self.frame_ready.emit(qimg)

    # ---------------------------------------------------------- control
    def _control_read_loop(self) -> None:
        sock = self._control_sock
        if sock is None:
            return
        try:
            while self._running:
                msg = protocol.read_device_message(sock.makefile("rb"))
                if msg is None:
                    break
                if msg.type == protocol.DEVICE_TYPE_CLIPBOARD:
                    self.clipboard_received.emit(msg.text)
        except Exception:
            pass

    def _control_write_loop(self) -> None:
        sock = self._control_sock
        if sock is None:
            return
        while self._running:
            if not self._send_queue:
                self._send_event.wait(timeout=0.5)
                self._send_event.clear()
                if not self._running:
                    break
            with self._send_lock:
                payload = self._send_queue.popleft() if self._send_queue else None
            if payload is None:
                continue
            try:
                sock.sendall(payload)
            except OSError:
                break

    # ------------------------------------------------------------- input
    def send_keycode(self, action: int, keycode: int, meta: int = 0) -> None:
        self.send(protocol.control_keycode(action, keycode, 0, meta))

    def send_text(self, text: str) -> None:
        self.send(protocol.control_text(text))

    def send_touch(self, action: int, x: int, y: int, pressure: int = protocol.PRESSURE_FULL) -> None:
        self.send(
            protocol.control_touch(
                action,
                protocol.POINTER_ID_MOUSE,
                x,
                y,
                self._dev_w,
                self._dev_h,
                pressure,
                protocol.BUTTON_PRIMARY if action == protocol.MOTION_DOWN else 0,
                protocol.BUTTON_PRIMARY if action != protocol.MOTION_UP else 0,
            )
        )

    def send_scroll(self, x: int, y: int, amount: float) -> None:
        self.send(protocol.control_scroll(x, y, self._dev_w, self._dev_h, 0.0, amount))

    def back(self) -> None:
        self.send(protocol.control_back_or_screen_on(protocol.MOTION_UP))

    def home(self) -> None:
        self.send_keycode(protocol.MOTION_DOWN, protocol.KEYCODE_HOME)
        self.send_keycode(protocol.MOTION_UP, protocol.KEYCODE_HOME)

    def recents(self) -> None:
        self.send_keycode(protocol.MOTION_DOWN, protocol.KEYCODE_APP_SWITCH)
        self.send_keycode(protocol.MOTION_UP, protocol.KEYCODE_APP_SWITCH)

    def power(self) -> None:
        self.send_keycode(protocol.MOTION_DOWN, protocol.KEYCODE_POWER)
        self.send_keycode(protocol.MOTION_UP, protocol.KEYCODE_POWER)

    def rotate(self) -> None:
        self.send(protocol.control_rotate())

    def set_display_power(self, on: bool) -> None:
        self.send(protocol.control_display_power(on))

    def start_app(self, package: str) -> None:
        self.send(protocol.control_start_app(package))
