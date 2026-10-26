path = r"H:\Default Project\analysis\Intip-rebuild\mockup\compare.html"
lines = open(path, encoding="utf-8").read().split("\n")

block = [
    '<h2>2b · Dock bawah (Start | timer | status)</h2>',
    '<div class="row">',
    '  <div class="card"><h2>REBUILD — dock bawah (terukur dari jendela rebuild)</h2>',
    '    <img src="rebuild_dock.png" width="660" alt="">',
    '    <div class="note">Struktur dari dock.js asli: Start • timer • pemisah • status (Wi-Fi, volume, baterai, cuaca, jam). Radius 24px, glass bg, blur 24px — spesifikasi sama dengan asli.</div>',
    '  </div>',
    '</div>',
    '',
]

for i, line in enumerate(lines):
    if "Identitas warna" in line:
        lines[i:i] = block
        break

open(path, "w", encoding="utf-8").write("\n".join(lines))
print("inserted dock section")
