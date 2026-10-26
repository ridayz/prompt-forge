from PIL import Image

crops = {
    'intip_idle':    ('intip_full.bmp',    700, 0, 1220, 220),
    'rebuild_idle':   ('rebuild_shot.bmp',  700, 0, 1220, 220),
    'rebuild_open':   ('rebuild_open.bmp',  600, 0, 1260, 220),
    'intip_open':     ('intip_win.bmp',    600, 0, 1260, 220),
}
for name, (fp, l, t, r, b) in crops.items():
    im = Image.open(r'H:\Default Project\analysis\Intip-rebuild\tools\\' + fp).convert('RGB')
    c = im.crop((l, t, r, b))
    c2 = c.resize((c.width * 2, c.height * 2), Image.LANCZOS)
    out = r'H:\Default Project\analysis\Intip-rebuild\tools\mockup_' + name + '.png'
    c2.save(out)
    print(name, '->', out, c2.size)
