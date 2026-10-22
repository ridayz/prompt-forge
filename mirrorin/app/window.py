"""Main application window + settings dialog."""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Dict, Optional

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QAction, QGuiApplication, QKeySequence
from PySide6.QtWidgets import (
    QCheckBox,
    QDialog,
    QFormLayout,
    QFrame,
    QGroupBox,
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QStatusBar,
    QVBoxLayout,
    QWidget,
)

from . import __version__, protocol
from .adb import Adb, AdbError
from .session import MirrorSettings, Session
from .videowidget import VideoWidget

# --------------------------------------------------------------------------
# Qt key -> Android keycode
# --------------------------------------------------------------------------
KEY_MAP: Dict[int, int] = {
    Qt.Key.Key_Backspace: 67,
    Qt.Key.Key_Return: 66,
    Qt.Key.Key_Enter: 66,
    Qt.Key.Key_Tab: 61,
    Qt.Key.Key_Escape: 111,
    Qt.Key.Key_Delete: 112,
    Qt.Key.Key_Home: 3,
    Qt.Key.Key_End: 123,
    Qt.Key.Key_PageUp: 92,
    Qt.Key.Key_PageDown: 93,
    Qt.Key.Key_Left: 21,
    Qt.Key.Key_Right: 22,
    Qt.Key.Key_Up: 19,
    Qt.Key.Key_Down: 20,
    Qt.Key.Key_Menu: 82,
    Qt.Key.Key_Copy: 278,
    Qt.Key.Key_Paste: 279,
    Qt.Key.Key_Cut: 277,
    Qt.Key.Key_VolumeUp: 24,
    Qt.Key.Key_VolumeDown: 25,
    Qt.Key.Key_VolumeMute: 164,
    Qt.Key.Key_MediaPlay: 85,
    Qt.Key.Key_MediaNext: 87,
    Qt.Key.Key_MediaPrevious: 88,
    Qt.Key.Key_Back: 4,
    Qt.Key.Key_Search: 84,
}


def _qt_to_android(key: int, text: str, modifiers: int) -> Optional[int]:
    """Return an Android keycode, or None if the event should be sent as text."""
    if key in KEY_MAP:
        return KEY_MAP[key]
    return None


class SettingsDialog(QDialog):
    def __init__(self, settings: MirrorSettings, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Pengaturan")
        self.setMinimumWidth(380)
        self._settings = settings
        self._build()

    def _build(self) -> None:
        s = self._settings
        layout = QVBoxLayout(self)

        grp = QGroupBox("Video", self)
        form = QFormLayout(grp)

        self.size = QSpinBox(grp)
        self.size.setRange(0, 2560)
        self.size.setSpecialValueText("Asli (0)")
        self.size.setValue(s.max_size)
        form.addRow("Batas resolusi sisi panjang:", self.size)

        self.bitrate = QSpinBox(grp)
        self.bitrate.setRange(500_000, 16_000_000)
        self.bitrate.setSingleStep(500_000)
        self.bitrate.setGroupSeparatorShown(True)
        self.bitrate.setValue(s.bitrate)
        form.addRow("Bitrate (bps):", self.bitrate)

        self.fps = QSpinBox(grp)
        self.fps.setRange(0, 240)
        self.fps.setSpecialValueText("Maksimal (0)")
        self.fps.setValue(s.max_fps)
        form.addRow("FPS maksimal:", self.fps)

        layout.addWidget(grp)

        grp2 = QGroupBox("Perangkat", self)
        form2 = QFormLayout(grp2)
        self.awake = QCheckBox("Biarkan layar HP tetap menyala", grp2)
        self.awake.setChecked(s.stay_awake)
        form2.addRow(self.awake)
        layout.addWidget(grp2)

        buttons = QHBoxLayout()
        buttons.addStretch(1)
        ok = QPushButton("Simpan", self)
        ok.setObjectName("primary")
        ok.clicked.connect(self._save)
        buttons.addWidget(ok)
        layout.addLayout(buttons)

    def _save(self) -> None:
        s = self._settings
        s.max_size = self.size.value()
        s.bitrate = self.bitrate.value()
        s.max_fps = self.fps.value()
        s.stay_awake = self.awake.isChecked()
        self.accept()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"mirrorin {__version__}")
        self.resize(1080, 700)
        self.setObjectName("root")

        self._adb = Adb()
        self._session = Session(self._adb)
        self._devices: list = []
        self._current: Optional[str] = None

        self._build_ui()
        self._connect_signals()
        self._apply_shortcuts()

        self._refresh_timer = QTimer(self)
        self._refresh_timer.setInterval(2500)
        self._refresh_timer.timeout.connect(self.refresh_devices)

        # delayed first refresh so the window paints first
        QTimer.singleShot(300, self.refresh_devices)

    # ------------------------------------------------------------------ ui
    def _build_ui(self) -> None:
        central = QWidget()
        central.setObjectName("root")
        self.setCentralWidget(central)

        root = QHBoxLayout(central)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        root.addWidget(self._build_sidebar())

        # ------------------------------------------------------- video side
        video_side = QWidget()
        vbox = QVBoxLayout(video_side)
        vbox.setContentsMargins(0, 0, 0, 0)
        vbox.setSpacing(0)

        self.video = VideoWidget()
        vbox.addWidget(self.video, 1)

        self._build_toolbar(video_side)

        self.status = QStatusBar()
        self.status.setSizeGripEnabled(False)
        self._status_label = QLabel("Siap")
        self._status_label.setObjectName("statusText")
        self.status.addPermanentWidget(self._status_label)
        vbox.addWidget(self.status)

        root.addWidget(video_side, 1)

    def _build_sidebar(self) -> QWidget:
        side = QFrame()
        side.setObjectName("sidebar")
        side.setFixedWidth(300)

        layout = QVBoxLayout(side)
        layout.setContentsMargins(18, 20, 18, 16)
        layout.setSpacing(14)

        header = QVBoxLayout()
        title = QLabel("mirrorin")
        title.setObjectName("appTitle")
        subtitle = QLabel("Screen mirroring modern")
        subtitle.setObjectName("appSubtitle")
        header.addWidget(title)
        header.addWidget(subtitle)
        layout.addLayout(header)

        layout.addWidget(self._section("Perangkat"))

        self.device_list = QListWidget()
        layout.addWidget(self.device_list, 1)

        buttons = QHBoxLayout()
        self.refresh_btn = QPushButton("Muat Ulang")
        self.refresh_btn.clicked.connect(self.refresh_devices)
        buttons.addWidget(self.refresh_btn)
        layout.addLayout(buttons)

        self.connect_btn = QPushButton("Hubungkan")
        self.connect_btn.setObjectName("primary connectBtn")
        self.connect_btn.setEnabled(False)
        self.connect_btn.clicked.connect(self.toggle_connection)
        layout.addWidget(self.connect_btn)

        self.disconnect_btn = QPushButton("Putuskan")
        self.disconnect_btn.setObjectName("danger")
        self.disconnect_btn.hide()
        self.disconnect_btn.clicked.connect(self.disconnect)
        layout.addWidget(self.disconnect_btn)

        self.device_status = QLabel("Tidak ada perangkat")
        self.device_status.setObjectName("statusText")
        layout.addWidget(self.device_status)

        layout.addStretch(1)

        self.settings_btn = QPushButton("Pengaturan")
        self.settings_btn.clicked.connect(self.open_settings)
        layout.addWidget(self.settings_btn)

        return side

    def _build_toolbar(self, parent: QWidget) -> None:
        bar = QFrame(parent)
        bar.setObjectName("toolbar")
        bar.setFixedHeight(64)
        bar.setStyleSheet(
            "QFrame#toolbar { background: rgba(9, 12, 18, 0.0); border: none; }"
        )
        bar_layout = QHBoxLayout(bar)
        bar_layout.setContentsMargins(20, 10, 20, 10)
        bar_layout.addStretch(1)

        tools = [
            ("⟲", "Putar layar", self._on_rotate),
            ("⌂", "Beranda", self._on_home),
            ("▢", "Aplikasi terakhir", self._on_recents),
            ("←", "Kembali", self._on_back),
            ("⤓", "Tangkapan layar", self._on_screenshot),
            ("⌨", "Kirim teks", self._on_send_text),
            ("⛶", "Layar penuh", self._on_fullscreen),
            ("⏻", "Dayakan/layuikan layar", self._on_power),
        ]
        for label, tooltip, handler in tools:
            btn = QPushButton(label)
            btn.setObjectName("tool")
            btn.setFixedSize(46, 42)
            btn.setToolTip(tooltip)
            btn.clicked.connect(handler)
            bar_layout.addWidget(btn)
        bar_layout.addStretch(1)

        # position the floating bar at the bottom centre of the video area
        bar.setParent(parent)
        bar.raise_()

    def _section(self, text: str) -> QLabel:
        label = QLabel(text)
        label.setObjectName("sectionTitle")
        return label

    # -------------------------------------------------------------- signals
    def _connect_signals(self) -> None:
        s = self._session
        s.frame_ready.connect(self.video.set_frame)
        s.device_name.connect(self._on_device_name)
        s.state_changed.connect(self._on_state_changed)
        s.error.connect(self._on_error)
        s.stats_updated.connect(self._on_stats)
        s.resolution_changed.connect(self._on_resolution)
        s.clipboard_received.connect(self._on_clipboard)

        self.video.mouse_action.connect(self._on_mouse_action)
        self.video.scroll.connect(self._on_scroll)
        self.video.key_event.connect(self._on_key_event)

        self.device_list.currentItemChanged.connect(self._on_device_selected)

    def _apply_shortcuts(self) -> None:
        def bind(seq, fn):
            action = QAction(self)
            action.setShortcut(QKeySequence(seq))
            action.triggered.connect(fn)
            self.addAction(action)

        bind("Ctrl+Shift+R", self.refresh_devices)
        bind("Ctrl+W", self.toggle_connection)
        bind("Ctrl+Q", self.close)
        bind("Ctrl+Shift+F", self._on_fullscreen)
        bind("Ctrl+Shift+S", self._on_screenshot)
        bind("Esc", self._leave_fullscreen)
        bind("Ctrl+Shift+C", self.disconnect)

    # -------------------------------------------------------------- devices
    def refresh_devices(self) -> None:
        try:
            self._devices = self._adb.devices()
        except AdbError as exc:
            self.device_status.setText(f"adb error: {exc}")
            return

        self.device_list.clear()
        ready = [d for d in self._devices if d.ready]
        for dev in self._devices:
            item = QListWidgetItem(dev.label)
            item.setData(Qt.ItemDataRole.UserRole, dev.serial)
            if not dev.ready:
                item.setForeground(Qt.GlobalColor.gray)
                item.setToolTip(f"status: {dev.status}")
            self.device_list.addItem(item)

        if not self._devices:
            self.device_status.setText("Tidak ada perangkat. Colokkan HP & aktifkan USB debugging.")
        elif not ready:
            self.device_status.setText(f"{len(self._devices)} perangkat, belum diizinkan.")
        else:
            self.device_status.setText(f"{len(ready)} perangkat siap.")

        self.connect_btn.setEnabled(bool(ready) and not self._session.connected)

    def _on_device_selected(self, current: QListWidgetItem, _previous) -> None:
        self._current = current.data(Qt.ItemDataRole.UserRole) if current else None

    def _selected_serial(self) -> Optional[str]:
        item = self.device_list.currentItem()
        if item:
            return item.data(Qt.ItemDataRole.UserRole)
        ready = [d for d in self._devices if d.ready]
        return ready[0].serial if ready else None

    # ---------------------------------------------------------- connection
    def toggle_connection(self) -> None:
        if self._session.connected:
            self.disconnect()
        else:
            self.connect()

    def connect(self) -> None:
        serial = self._selected_serial()
        if not serial:
            QMessageBox.information(self, "mirrorin", "Pilih perangkat dulu.")
            return
        try:
            settings = SettingsDialog(self._session.settings, self).settings
        except Exception:
            settings = self._session.settings
        self._session.start(serial, settings)

    def disconnect(self) -> None:
        self._session.stop()

    def _on_state_changed(self, state: str) -> None:
        if state == "connected":
            self.connect_btn.hide()
            self.disconnect_btn.show()
            self.device_list.setEnabled(False)
            self.refresh_btn.setEnabled(False)
            self._status_label.setText("Tersambung")
        elif state == "connecting":
            self.connect_btn.setEnabled(False)
            self._status_label.setText("Menyambungkan...")
        else:
            self.connect_btn.show()
            self.connect_btn.setEnabled(bool([d for d in self._devices if d.ready]))
            self.disconnect_btn.hide()
            self.device_list.setEnabled(True)
            self.refresh_btn.setEnabled(True)
            self._status_label.setText("Terputus")
            self.video.clear_frame()

    def _on_device_name(self, name: str) -> None:
        self.setWindowTitle(f"mirrorin - {name}")

    def _on_resolution(self, w: int, h: int) -> None:
        self.video.set_video_size(w, h)

    def _on_stats(self, fps: str) -> None:
        self._status_label.setText(f"{fps} fps")

    def _on_error(self, message: str) -> None:
        self._status_label.setText("Kesalahan")
        QMessageBox.critical(self, "mirrorin", message)

    def _on_clipboard(self, text: str) -> None:
        QGuiApplication.clipboard().setText(text)
        self._status_label.setText("Clipboard disalin dari perangkat")

    # ---------------------------------------------------------------- input
    def _on_mouse_action(self, action: int, x: int, y: int) -> None:
        if action == -1:
            self._session.back()
            self.video.show_overlay("Kembali")
        elif action == -2:
            self._session.home()
            self.video.show_overlay("Beranda")
        else:
            pressure = protocol.PRESSURE_FULL if action != protocol.MOTION_UP else 0
            self._session.send_touch(action, x, y, pressure)

    def _on_scroll(self, x: int, y: int, amount: float) -> None:
        self._session.send_scroll(x, y, amount)

    def _on_key_event(self, key: int, text: str, modifiers: int) -> None:
        ctrl = bool(modifiers & Qt.KeyboardModifier.ControlModifier)

        # Ctrl+letter -> keycode with CTRL meta
        if ctrl and Qt.Key.Key_A <= key <= Qt.Key.Key_Z:
            code = 29 + (key - Qt.Key.Key_A)
            meta = 0x1000  # META_CTRL_ON
            self._session.send_keycode(protocol.MOTION_DOWN, code, meta)
            self._session.send_keycode(protocol.MOTION_UP, code, meta)
            return

        mapped = KEY_MAP.get(key)
        if mapped is not None:
            self._session.send_keycode(protocol.MOTION_DOWN, mapped)
            self._session.send_keycode(protocol.MOTION_UP, mapped)
            return

        # printable character -> inject as text (handles unicode too)
        if text and len(text) == 1 and text.isprintable():
            self._session.send_text(text)

    # ------------------------------------------------------------- actions
    def _on_back(self) -> None:
        self._session.back()
        self.video.show_overlay("Kembali")

    def _on_home(self) -> None:
        self._session.home()
        self.video.show_overlay("Beranda")

    def _on_recents(self) -> None:
        self._session.recents()
        self.video.show_overlay("Aplikasi terakhir")

    def _on_rotate(self) -> None:
        self._session.rotate()
        self.video.show_overlay("Memutar layar...")

    def _on_power(self) -> None:
        self._session.power()
        self.video.show_overlay("Power")

    def _on_send_text(self) -> None:
        text, ok = QInputDialog.getMultiLineText(self, "Kirim teks", "Teks yang dikirim ke perangkat:")
        if ok and text:
            self._session.send_text(text)

    def _on_screenshot(self) -> None:
        image = self.video._image
        if image is None:
            QMessageBox.information(self, "mirrorin", "Belum ada frame untuk ditangkap.")
            return
        folder = str(Path.home() / "Pictures")
        os.makedirs(folder, exist_ok=True)
        name = f"mirrorin_{time.strftime('%Y%m%d_%H%M%S')}.png"
        path = str(Path(folder) / name)
        if image.save(path):
            self.video.show_overlay(f"Tersimpan: {name}")
            self._status_label.setText(path)
        else:
            QMessageBox.warning(self, "mirrorin", "Gagal menyimpan tangkapan layar.")

    def _on_fullscreen(self) -> None:
        self.showFullScreen()
        self.menuBar().hide()

    def _leave_fullscreen(self) -> None:
        if self.isFullScreen():
            self.showNormal()
            self.menuBar().show()

    # ------------------------------------------------------------- settings
    def open_settings(self) -> None:
        dlg = SettingsDialog(self._session.settings, self)
        dlg.exec()

    # --------------------------------------------------------------- events
    def resizeEvent(self, event) -> None:  # noqa: N802
        super().resizeEvent(event)
        bar = self.findChild(QFrame, "toolbar")
        if bar:
            bar.move(0, self.video.height() - bar.height() - 8)

    def closeEvent(self, event) -> None:  # noqa: N802
        self._session.stop()
        super().closeEvent(event)
