# mirrorin

Aplikasi **screen mirroring Android** untuk Windows dengan UI modern, kompatibel
dengan protokol resmi **scrcpy**. Ditulis dalam Python + Qt (PySide6).

Alih-alih membuat ulang encoder, `mirrorin` memakai `scrcpy-server` resmi di sisi
perangkat (sudah dibundel di `bin/`), lalu mengimplementasikan **client**-nya
sendiri: decode H.264, render, dan injeksi input.

## Fitur

- Daftar perangkat otomatis (adb)
- Mirror layar real-time (H.264, sampai 1080p / 60fps)
- Kontrol mouse (klik, drag, klik kanan = Back, klik tengah = Home)
- Scroll pakai roda mouse
- Keyboard: ketik teks (termasuk Unicode), tombol khusus, Ctrl+ huruf
- Sinkronisasi clipboard dari perangkat
- Putar layar, screenshot (PNG), kirim teks panjang
- Pengaturan resolusi / bitrate / FPS
- Tema gelap modern

## Kebutuhan

- Windows 10/11 (64-bit)
- HP Android dengan **USB debugging** aktif
- Kabel USB (atau pairing nirkabel via `adb connect`)

## Menjalankan

```bash
cd "C:\Users\DONCUL-PC\Documents\Default Project\mirrorin"
python -m pip install -r requirements.txt
python main.py
```

## Cara pakai

1. Aktifkan **Developer options → USB debugging** di HP.
2. Colokkan HP ke PC, lalu izinkan dialog "Allow USB debugging?".
3. Buka `mirrorin`, klik **Muat Ulang** sampai HP muncul.
4. Klik **Hubungkan**.

Mouse akan otomatis terkunci ke dalam layar HP. Klik kanan = Back,
klik tengah = Home, tekan `Esc` untuk keluar dari layar penuh.

## Arsitektur

| File | Tanggung jawab |
|------|----------------|
| `main.py` | entry point Qt |
| `app/adb.py` | wrapper `adb.exe` |
| `app/protocol.py` | protokol wire scrcpy (encode/decode) |
| `app/decoder.py` | decode H.264 via PyAV/FFmpeg |
| `app/session.py` | orkestrasi socket + thread |
| `app/videowidget.py` | render frame + terjemahan input |
| `app/window.py` | UI utama |
| `app/styles.py` | tema QSS |

## Catatan

Protokol client-server scrcpy bersifat internal dan bisa berubah antar versi.
Versi server yang dibundel: **scrcpy-server 5.0.1**.
