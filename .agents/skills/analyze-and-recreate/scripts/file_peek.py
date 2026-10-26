#!/usr/bin/env python3
"""file_peek.py - Magic bytes, file type, entropy, strings
Usage: py file_peek.py <file> [--all] [--entropy] [--strings] [--out JSON]
"""
import os, math, json, binascii, argparse

MAGICS = [
    (b"MZ", "PE/EXE", "Windows executable"),
    (b"\x7fELF", "ELF", "Linux executable"),
    (b"PK\x03\x04", "ZIP", "ZIP / Office / JAR"),
    (b"\x89PNG\r\n\x1a\n", "PNG", "PNG image"),
    (b"\xff\xd8\xff", "JPEG", "JPEG image"),
    (b"%PDF", "PDF", "PDF document"),
    (b"GIF8", "GIF", "GIF image"),
    (b"RIFF", "RIFF", "RIFF media (AVI/WAV)"),
    (b"OggS", "OGG", "OGG media"),
    (b"\x1f\x8b", "GZIP", "GZIP compressed"),
    (b"BZh", "BZIP2", "BZIP2 compressed"),
    (b"\xfd7zXZ\x00", "XZ", "XZ compressed"),
    (b"SQLite", "SQLite", "SQLite database"),
    (b"BM", "BMP", "BMP image"),
    (b"\xd0\xcf\x11\xe0", "OLE", "MS Office compound doc"),
    (b"\xca\xfe\xba\xbe", "MACHO", "macOS Mach-O"),
]

def entropy(data):
    if not data: return 0
    freq = [0] * 256
    for b in data: freq[b] += 1
    ent = 0
    for c in freq:
        if c:
            p = c / len(data)
            ent -= p * math.log2(p)
    return round(ent, 4)

def strings(data, min_len=6):
    result, buf = [], []
    for b in data:
        if 32 <= b < 127:
            buf.append(chr(b))
        else:
            if len(buf) >= min_len:
                result.append("".join(buf))
            buf = []
    if len(buf) >= min_len:
        result.append("".join(buf))
    return result

def detect(data):
    for magic, ftype, desc in MAGICS:
        if data.startswith(magic):
            return ftype, desc
    return "UNKNOWN", "Unrecognized"

def main():
    p = argparse.ArgumentParser(description="File magic / entropy / strings")
    p.add_argument("file")
    p.add_argument("--entropy", action="store_true")
    p.add_argument("--strings", action="store_true")
    p.add_argument("--all", action="store_true")
    p.add_argument("--out", help="Save JSON result")
    p.add_argument("--min-len", type=int, default=6)
    a = p.parse_args()

    size = os.path.getsize(a.file)
    with open(a.file, "rb") as fh:
        data = fh.read(min(8192, size))

    ftype, fdesc = detect(data)
    print(f"File : {a.file}")
    print(f"Size : {size:,} bytes")
    print(f"Type : {ftype} - {fdesc}")
    print(f"Magic: {binascii.hexlify(data[:8]).decode()}")

    if a.entropy or a.all:
        with open(a.file, "rb") as fh:
            all_data = fh.read()
        e = entropy(all_data)
        print(f"Entropy: {e} / 8.0")
        if e > 7.0:
            print("  -> High entropy = compressed/encrypted")

    if a.strings or a.all:
        with open(a.file, "rb") as fh:
            all_data = fh.read()
        strs = strings(all_data, a.min_len)
        print(f"\nStrings ({len(strs)} found, minlen={a.min_len}):")
        for s in strs[:50]:
            print(f"  {s}")
        if len(strs) > 50:
            print(f"  ... and {len(strs)-50} more")

    result = {"file": a.file, "size": size, "type": ftype, "desc": fdesc,
              "magic": binascii.hexlify(data[:8]).decode()}
    if a.out:
        with open(a.out, "w") as fh:
            json.dump(result, fh, indent=2)
        print(f"\nSaved: {a.out}")

if __name__ == "__main__":
    main()
