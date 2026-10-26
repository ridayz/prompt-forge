from PIL import Image


def bb(im, xmax, thr=15):
    xs, ys = [], []
    for y in range(0, 180):
        for x in range(0, xmax, 2):
            if max(im.getpixel((x, y))) > thr:
                xs.append(x)
                ys.append(y)
    return (min(xs), max(xs), max(xs) - min(xs) + 1,
            min(ys), max(ys), max(ys) - min(ys) + 1)


# original open: full-screen PrintWindow capture; notch at x 760..1160, y 0..159
a = Image.open(r"H:\Default Project\analysis\Intip-rebuild\tools\intip_win.bmp").convert("RGB")
# rebuild open: 460x180 window capture
b = Image.open(r"H:\Default Project\analysis\Intip-rebuild\tools\rb_open_final.bmp").convert("RGB")

wa = min(1400, a.size[0])
ra = bb(a, wa)
rb = bb(b, 459)

print("ASLI    open: x %d..%d (w=%d)  y %d..%d (h=%d)" % ra)
print("REBUILD open: x %d..%d (w=%d)  y %d..%d (h=%d)" % rb)
