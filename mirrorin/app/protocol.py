"""Wire protocol for the scrcpy server (v5.0.1).

mirrorin talks to ``scrcpy-server`` over up to three sockets:

* **video**   -- raw H.264 stream (Annex-B), with a small header per packet
* **audio**   -- not used by mirrorin
* **control** -- bidirectional, custom binary protocol

The device metadata (name) is always sent first on the *first* socket, as a
fixed 64-byte blob.

Sources (read from the official scrcpy v5.0.1 repository):

* ``doc/protocol.md``
* ``server/.../control/ControlMessage.java``      (type constants)
* ``server/.../control/ControlMessageReader.java`` (byte layout)
* ``server/.../control/DeviceMessage.java``       (byte layout)
* ``server/.../device/DesktopConnection.java``    (device meta format)
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field
from typing import Optional

# --------------------------------------------------------------------------
# Control message types (client -> device)
# --------------------------------------------------------------------------
TYPE_INJECT_KEYCODE = 0
TYPE_INJECT_TEXT = 1
TYPE_INJECT_TOUCH_EVENT = 2
TYPE_INJECT_SCROLL_EVENT = 3
TYPE_BACK_OR_SCREEN_ON = 4
TYPE_EXPAND_NOTIFICATION_PANEL = 5
TYPE_EXPAND_SETTINGS_PANEL = 6
TYPE_COLLAPSE_PANELS = 7
TYPE_GET_CLIPBOARD = 8
TYPE_SET_CLIPBOARD = 9
TYPE_SET_DISPLAY_POWER = 10
TYPE_ROTATE_DEVICE = 11
TYPE_START_APP = 16
TYPE_RESET_VIDEO = 17
TYPE_RESIZE_DISPLAY = 21

# --------------------------------------------------------------------------
# Device message types (device -> client)
# --------------------------------------------------------------------------
DEVICE_TYPE_CLIPBOARD = 0
DEVICE_TYPE_ACK_CLIPBOARD = 1

# --------------------------------------------------------------------------
# Android constants
# --------------------------------------------------------------------------
# KeyEvent
KEYCODE_BACK = 4
KEYCODE_HOME = 3
KEYCODE_APP_SWITCH = 187
KEYCODE_POWER = 26
KEYCODE_ENTER = 66
KEYCODE_DEL = 67
KEYCODE_VOLUME_UP = 24
KEYCODE_VOLUME_DOWN = 25

# MotionEvent
MOTION_DOWN = 0
MOTION_UP = 1
MOTION_MOVE = 2
BUTTON_PRIMARY = 1

# Fixed-point pressure: raw 0xFFFF == 1.0
PRESSURE_FULL = 0xFFFF

# scrcpy uses all-bits-set as pointer id for the mouse
POINTER_ID_MOUSE = 0xFFFFFFFFFFFFFFFF

# The server always sends the device name as a fixed 64-byte blob
DEVICE_NAME_LEN = 64

# --------------------------------------------------------------------------
# Encoders (client -> device). All multi-byte values are big-endian.
# --------------------------------------------------------------------------


def control_keycode(action: int, keycode: int, repeat: int, meta_state: int) -> bytes:
    """u8 type | u8 action | i32 keycode | i32 repeat | i32 metaState"""
    return struct.pack(">BBiii", TYPE_INJECT_KEYCODE, action & 0xFF, keycode, repeat, meta_state)


def control_text(text: str) -> bytes:
    """u8 type | i32 length | utf8 bytes"""
    raw = text.encode("utf-8")[:300]
    return struct.pack(">Bi", TYPE_INJECT_TEXT, len(raw)) + raw


def control_touch(
    action: int,
    pointer_id: int,
    x: int,
    y: int,
    screen_w: int,
    screen_h: int,
    pressure: int,
    action_button: int,
    buttons: int,
) -> bytes:
    """u8 type | u8 action | i64 pointerId | i32 x | i32 y
    | u16 screenW | u16 screenH | i16 pressure | i32 actionButton | i32 buttons"""
    return struct.pack(
        ">BBqiiHHhii",
        TYPE_INJECT_TOUCH_EVENT,
        action & 0xFF,
        pointer_id,
        x,
        y,
        screen_w & 0xFFFF,
        screen_h & 0xFFFF,
        pressure,
        action_button,
        buttons,
    )


def control_scroll(
    x: int,
    y: int,
    screen_w: int,
    screen_h: int,
    h_scroll: float,
    v_scroll: float,
    buttons: int = 0,
) -> bytes:
    """Scroll values are encoded as i16 fixed point over the range [-16, 16]."""
    def enc(v: float) -> int:
        v = max(-16.0, min(16.0, v))
        return int(round(v * 2048)) & 0xFFFF

    return struct.pack(
        ">BiiHHhhi",
        TYPE_INJECT_SCROLL_EVENT,
        x,
        y,
        screen_w & 0xFFFF,
        screen_h & 0xFFFF,
        enc(h_scroll),
        enc(v_scroll),
        buttons,
    )


def control_back_or_screen_on(action: int) -> bytes:
    return struct.pack(">BB", TYPE_BACK_OR_SCREEN_ON, action & 0xFF)


def control_empty(msg_type: int) -> bytes:
    """Message types that carry no payload."""
    return struct.pack(">B", msg_type)


def control_get_clipboard(copy_key: int = 1) -> bytes:
    return struct.pack(">BB", TYPE_GET_CLIPBOARD, copy_key & 0xFF)


def control_set_clipboard(sequence: int, text: str, paste: bool) -> bytes:
    """u8 type | i64 sequence | u8 paste | i32 length | utf8 bytes"""
    raw = text.encode("utf-8")[: (1 << 18) - 14]
    return struct.pack(">BqBi", TYPE_SET_CLIPBOARD, sequence, 1 if paste else 0, len(raw)) + raw


def control_display_power(on: bool) -> bytes:
    return struct.pack(">BB", TYPE_SET_DISPLAY_POWER, 1 if on else 0)


def control_rotate() -> bytes:
    return control_empty(TYPE_ROTATE_DEVICE)


def control_start_app(package: str) -> bytes:
    """u8 type | u8 length | utf8 bytes"""
    raw = package.encode("utf-8")[:255]
    return struct.pack(">BB", TYPE_START_APP, len(raw)) + raw


# --------------------------------------------------------------------------
# Decoders (device -> client)
# --------------------------------------------------------------------------


@dataclass
class DeviceMessage:
    type: int
    text: str = ""
    sequence: int = 0
    data: bytes = field(default=b"")


def read_device_message(reader) -> Optional[DeviceMessage]:
    """Read one device message from a buffered binary stream.

    Raises on protocol error, returns ``None`` on clean EOF.
    """
    header = reader.read(1)
    if not header:
        return None
    msg_type = header[0]

    if msg_type == DEVICE_TYPE_CLIPBOARD:
        length = struct.unpack(">i", reader.read(4))[0]
        raw = reader.read(length)
        return DeviceMessage(msg_type, text=raw.decode("utf-8", "replace"))

    if msg_type == DEVICE_TYPE_ACK_CLIPBOARD:
        sequence = struct.unpack(">q", reader.read(8))[0]
        return DeviceMessage(msg_type, sequence=sequence)

    # Unknown type: we cannot resynchronise, so report and let caller decide.
    raise ValueError(f"Unknown device message type: {msg_type}")
