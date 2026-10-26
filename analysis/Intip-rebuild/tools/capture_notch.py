"""PrintWindow the Intip-Rebuild overlay after clicking the notch.
Usage: python capture_notch.py <out.bmp> <click|noclick>
"""
import ctypes
import ctypes.wintypes as wt
import sys
import time

u = ctypes.windll.user32
u.SetProcessDPIAware()
g = ctypes.windll.gdi32


class BMIH(ctypes.Structure):
    _fields_ = [("a", ctypes.c_uint32), ("bw", ctypes.c_int32),
                ("bh", ctypes.c_int32), ("p", ctypes.c_uint16),
                ("bc", ctypes.c_uint16), ("c", ctypes.c_uint32),
                ("sz", ctypes.c_uint32), ("x1", ctypes.c_int32),
                ("y1", ctypes.c_int32), ("u1", ctypes.c_uint32),
                ("u2", ctypes.c_uint32)]


class BFH(ctypes.Structure):
    _pack_ = 1
    _fields_ = [("t", ctypes.c_char * 2), ("s", ctypes.c_uint32),
                ("r2", ctypes.c_uint16 * 2), ("o", ctypes.c_uint32)]


def find_hwnd(title):
    return u.FindWindowW(None, title)


def capture(hwnd, path):
    r = wt.RECT()
    u.GetWindowRect(hwnd, ctypes.byref(r))
    w, h = r.right - r.left, r.bottom - r.top
    hdc = u.GetWindowDC(hwnd)
    mdc = g.CreateCompatibleDC(hdc)
    bmp = g.CreateCompatibleBitmap(hdc, w, h)
    g.SelectObject(mdc, bmp)
    u.PrintWindow(hwnd, mdc, 2)
    bmi = BMIH(40, w, -h, 1, 32, 0, 0, 0, 0, 0, 0)
    buf = ctypes.create_string_buffer(w * h * 4)
    g.GetDIBits(mdc, bmp, 0, h, buf, ctypes.byref(bmi), 0)
    fh = BFH(b"BM", 54 + w * h * 4, (0, 0), 54)
    with open(path, "wb") as f:
        f.write(fh)
        f.write(bytes(bmi))
        f.write(buf.raw)
    return w, h


out, mode = sys.argv[1], sys.argv[2]

# wait up to 30s for the window to appear
hwnd = 0
for _ in range(60):
    hwnd = find_hwnd("Intip-Rebuild")
    if hwnd:
        break
    time.sleep(0.5)
if not hwnd:
    print("WINDOW NOT FOUND")
    sys.exit(1)

time.sleep(2)  # let it render

if mode == "click":
    # notch center: window at 730..1190, notch 150px centered => (960, 18)
    u.SetCursorPos(960, 18)
    time.sleep(0.4)
    u.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.06)
    u.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(1.0)

w, h = capture(hwnd, out)
print("captured", out, w, "x", h)
