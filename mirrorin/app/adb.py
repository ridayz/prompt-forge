"""Thin wrapper around the bundled ``adb.exe``."""

from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


class AdbError(Exception):
    pass


@dataclass
class Device:
    serial: str
    status: str
    model: str = ""

    @property
    def ready(self) -> bool:
        return self.status == "device"

    @property
    def label(self) -> str:
        if self.model:
            return f"{self.model}  ({self.serial})"
        return self.serial


class Adb:
    """Minimal synchronous adb client."""

    def __init__(self, adb_path: Optional[str] = None):
        if adb_path is None:
            adb_path = str(Path(__file__).resolve().parent.parent / "bin" / "adb.exe")
        self.path = str(adb_path)
        if not os.path.exists(self.path):
            raise AdbError(f"adb tidak ditemukan: {self.path}")

    # ------------------------------------------------------------------ util
    def _run(self, args: List[str], timeout: float = 60.0, check: bool = False) -> subprocess.CompletedProcess:
        cmd = [self.path, *args]
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                timeout=timeout,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except subprocess.TimeoutExpired as exc:
            raise AdbError(f"adb timeout: {' '.join(args)}") from exc
        except OSError as exc:
            raise AdbError(f"tidak bisa menjalankan adb: {exc}") from exc

        if check and proc.returncode != 0:
            err = proc.stderr.decode("utf-8", "replace").strip()
            raise AdbError(err or f"adb gagal ({proc.returncode})")
        return proc

    def _out(self, args: List[str], timeout: float = 60.0) -> str:
        proc = self._run(args, timeout=timeout)
        return proc.stdout.decode("utf-8", "replace")

    # --------------------------------------------------------------- server
    def ensure_server(self) -> None:
        self._run(["start-server"], timeout=30, check=False)

    def kill_server(self) -> None:
        self._run(["kill-server"], timeout=15, check=False)

    def version(self) -> str:
        return self._out(["version"]).strip().splitlines()[0] if self._out(["version"]).strip() else ""

    # -------------------------------------------------------------- devices
    def devices(self) -> List[Device]:
        out = self._out(["devices", "-l"])
        result: List[Device] = []
        for line in out.splitlines()[1:]:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            serial, status = parts[0], parts[1]
            model = ""
            for token in parts[2:]:
                if token.startswith("model:"):
                    model = token.split(":", 1)[1]
            result.append(Device(serial=serial, status=status, model=model))
        return result

    def device_count(self) -> int:
        return len([d for d in self.devices() if d.ready])

    # ------------------------------------------------------------ commands
    def shell(self, serial: str, command: str, timeout: float = 60.0) -> str:
        return self._out(["-s", serial, "shell", command], timeout=timeout)

    def push(self, serial: str, src: str, dst: str) -> None:
        self._run(["-s", serial, "push", src, dst], timeout=300, check=True)

    def reverse(self, serial: str, device_socket: str, host_port: int) -> None:
        self._run(["-s", serial, "reverse", device_socket, f"tcp:{host_port}"], check=True)

    def remove_reverse(self, serial: str, device_socket: str) -> None:
        self._run(["-s", serial, "reverse", "--remove", device_socket], check=False)

    # --------------------------------------------------------- device info
    def screen_size(self, serial: str) -> tuple:
        """Return ``(width, height)`` of the physical screen."""
        out = self.shell(serial, "wm size")
        match = re.search(r"(\d+)x(\d+)", out)
        if not match:
            return (0, 0)
        return (int(match.group(1)), int(match.group(2)))

    def device_name(self, serial: str) -> str:
        out = self.shell(serial, "getprop ro.product.model").strip()
        return out or serial

    def android_version(self, serial: str) -> str:
        return self.shell(serial, "getprop ro.build.version.release").strip()
