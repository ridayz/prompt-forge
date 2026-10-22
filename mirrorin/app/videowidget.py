"""Video surface: renders frames and translates mouse/keyboard into input."""

from __future__ import annotations

from typing import Optional, Tuple

from PySide6.QtCore import QPoint, QRectF, Qt, Signal
from PySide6.QtGui import QColor, QImage, QKeyEvent, QMouseEvent, QPaintEvent, QPainter, QWheelEvent
from PySide6.QtWidgets import QWidget

from . import protocol


class VideoWidget(QWidget):
    """Displays the mirrored screen and forwards user input."""

    mouse_action = Signal(int, int, int)   # action, device_x, device_y
    scroll = Signal(int, int, float)       # device_x, device_y, amount
    key_event = Signal(int, str, int)      # qt key, text, modifiers

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("videoArea")
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setMouseTracking(True)
        self.setCursor(Qt.CursorShape.BlankCursor)

        self._image: Optional[QImage] = None
        self._device_size: Tuple[int, int] = (0, 0)
        self._video_size: Tuple[int, int] = (0, 0)

        self._pressed = False
        self._press_pos = QPoint()
        self._hover = False
        self._overlay = ""
        self._overlay_until = 0.0

    # ------------------------------------------------------------- config
    def set_device_size(self, w: int, h: int) -> None:
        self._device_size = (w, h)

    def set_video_size(self, w: int, h: int) -> None:
        self._video_size = (w, h)

    def show_overlay(self, text: str, seconds: float = 1.6) -> None:
        import time

        self._overlay = text
        self._overlay_until = time.time() + seconds
        self.update()

    def clear_frame(self) -> None:
        self._image = None
        self.update()

    # ------------------------------------------------------------- frame
    def set_frame(self, image: QImage) -> None:
        self._image = image
        self.update()

    # ------------------------------------------------------------ layout
    def _target_rect(self) -> QRectF:
        w, h = self.width(), self.height()
        if self._image is None or not self._image.width():
            return QRectF(0, 0, 0, 0)
        iw, ih = self._image.width(), self._image.height()
        scale = min(w / iw, h / ih)
        dw, dh = iw * scale, ih * scale
        return QRectF((w - dw) / 2, (h - dh) / 2, dw, dh)

    def _to_device(self, pos: QPoint) -> Tuple[int, int]:
        rect = self._target_rect()
        vid_w, vid_h = self._video_size or (self._image.width() if self._image else 0, 0)
        dev_w, dev_h = self._device_size

        if not vid_w or not vid_h:
            return (0, 0)

        vx = (pos.x() - rect.x()) / rect.width() * vid_w
        vy = (pos.y() - rect.y()) / rect.height() * vid_h
        vx = max(0, min(vid_w - 1, int(vx)))
        vy = max(0, min(vid_h - 1, int(vy)))

        if dev_w and dev_h:
            # The video is encoded in the current orientation, so the device
            # screen may need to be swapped to match.
            if (vid_w > vid_h) != (dev_w > dev_h):
                dev_w, dev_h = dev_h, dev_w
            return (int(vx * dev_w / vid_w), int(vy * dev_h / vid_h))
        return (vx, vy)

    # ------------------------------------------------------------ paint
    def paintEvent(self, event: QPaintEvent) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)
        painter.fillRect(self.rect(), QColor("#05070b"))

        if self._image is not None:
            rect = self._target_rect()
            painter.drawImage(rect, self._image)
        else:
            self._paint_placeholder(painter)

        import time

        if self._overlay and time.time() < self._overlay_until:
            self._paint_overlay(painter)
        painter.end()

    def _paint_placeholder(self, painter: QPainter) -> None:
        painter.setPen(QColor("#8b94a7"))
        text = "Belum ada perangkat tersambung"
        painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, text)

    def _paint_overlay(self, painter: QPainter) -> None:
        font = painter.font()
        font.setPointSize(13)
        painter.setFont(font)
        metrics = painter.fontMetrics()
        w = metrics.horizontalAdvance(self._overlay) + 40
        h = metrics.height() + 24
        rect = QRectF((self.width() - w) / 2, self.height() - h - 40, w, h)
        painter.setPen(QColor("#2e3749"))
        painter.setBrush(QColor(15, 19, 28, 235))
        painter.drawRoundedRect(rect, 12, 12)
        painter.setPen(QColor("#e6eaf2"))
        painter.drawText(rect, Qt.AlignmentFlag.AlignCenter, self._overlay)

    # ------------------------------------------------------------ mouse
    def mousePressEvent(self, event: QMouseEvent) -> None:  # noqa: N802
        self.setFocus()
        x, y = self._to_device(event.position().toPoint())
        button = event.button()

        if button == Qt.MouseButton.RightButton:
            # scrcpy: right click == back
            self.mouse_action.emit(-1, 0, 0)
            return
        if button == Qt.MouseButton.MiddleButton:
            # scrcpy: middle click == home
            self.mouse_action.emit(-2, 0, 0)
            return

        self._pressed = True
        self._press_pos = event.position().toPoint()
        self.mouse_action.emit(protocol.MOTION_DOWN, x, y)

    def mouseMoveEvent(self, event: QMouseEvent) -> None:  # noqa: N802
        if not self._pressed:
            return
        x, y = self._to_device(event.position().toPoint())
        self.mouse_action.emit(protocol.MOTION_MOVE, x, y)

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:  # noqa: N802
        if not self._pressed:
            return
        self._pressed = False
        x, y = self._to_device(event.position().toPoint())
        self.mouse_action.emit(protocol.MOTION_UP, x, y)

    def wheelEvent(self, event: QWheelEvent) -> None:  # noqa: N802
        if not self._video_size[0]:
            return
        delta = event.angleDelta().y()
        if delta == 0:
            return
        x, y = self._to_device(event.position().toPoint())
        self.scroll.emit(x, y, delta / 120.0)

    # --------------------------------------------------------- keyboard
    def keyPressEvent(self, event: QKeyEvent) -> None:  # noqa: N802
        self.key_event.emit(event.key(), event.text(), int(event.modifiers()))

    def enterEvent(self, event) -> None:  # noqa: N802
        self._hover = True
        self.setCursor(Qt.CursorShape.BlankCursor)

    def leaveEvent(self, event) -> None:  # noqa: N802
        self._hover = False
        self.setCursor(Qt.CursorShape.ArrowCursor)
