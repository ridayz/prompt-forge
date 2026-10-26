import ctypes
import ctypes.wintypes as wt
import sys

u = ctypes.windll.user32
u.SetProcessDPIAware()


def shot_all(path):
    w, h = u.GetSystemMetrics(0), u.GetSystemMetrics(1)
    hdc = u.GetWindowDC(0)
    mdc = ctypes.windll.gdi32.CreateCompatibleDC(hdc)
    bmp = ctypes.windll.gdi32.CreateCompatibleBitmap(hdc, w, h)
    ctypes.windll.gdi32.SelectObject(mdc, bmp)
    # BitBlt SRCCOPY | CAPTUREBLT
    ctypes.windll.gdi32.BitBlt(mdc, 0, 0, w, h, hdc, 0, 0, 0x00CC0020 | 0x40000000)
    class BMIH(ctypes.Structure):
        _fields_ = [
            ("biSize", ctypes.c_uint32), ("biWidth", ctypes.c_int32),
            ("biHeight", ctypes.c_int32), ("biPlanes", ctypes.c_uint16),
            ("biBitCount", ctypes.c_uint16), ("biCompression", ctypes.c_uint32),
            ("biSizeImage", ctypes.c_uint32), ("biXPelsPerMeter", ctypes.c_int32),
            ("biYPelsPerMeter", ctypes.c_int32), ("biClrUsed", ctypes.c_uint32),
            ("biClrImportant", ctypes.c_uint32),
        ]
    bmi = BMIH(ctypes.sizeof(BMIH), w, -h, 1, 32, 0, 0, 0, 0, 0, 0)
    buf = ctypes.create_string_buffer(w * h * 4)
    gdi = ctypes.windll.gdi32
    gdi.GetDIBits(mdc, bmp, 0, h, buf, ctypes.byref(bmi), 0)
    # Write BMP manually (no PIL dependency needed)
    class BFH(ctypes.Structure):
        _pack_ = 1
        _fields_ = [("type", ctypes.c_char * 2), ("size", ctypes.c_uint32),
                    ("res", ctypes.c_uint16 * 2), ("off", ctypes.c_uint32)]
    data_size = w * h * 4
    header_size = 14 + 40
    fh = BFH(b"BM", header_size + data_size, (0, 0), header_size)
    with open(path, "wb") as f:
        f.write(fh)
        f.write(bytes(bmi))
        f.write(buf.raw)
    print("saved", path, w, "x", h)


if __name__ == "__main__":
    shot_all(sys.argv[1] if len(sys.argv) > 1 else "shot.bmp")
