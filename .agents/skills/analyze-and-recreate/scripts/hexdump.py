#!/usr/bin/env python3
"""hexdump.py - Rich hexdump with ASCII, offsets, struct hints
Usage: py hexdump.py <file> [--offset N] [--length N] [--highlight PATTERN] [--struct]
"""
import binascii, argparse

def hexdump(data, offset=0, length=None, highlight=None):
    if length:
        data = data[:length]
    lines = []
    for i in range(0, len(data), 16):
        chunk = data[i:i+16]
        addr = offset + i
        hex_part = " ".join(f"{b:02x}" for b in chunk).ljust(47)
        ascii_part = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
        line = f"{addr:08x}  {hex_part}  |{ascii_part}|"
        if highlight and highlight.encode() in chunk:
            line = ">>>" + line
        lines.append(line)
    return "\n".join(lines)

MAGICS = [
    (b"MZ", "PE/EXE"), (b"\x7fELF", "ELF"), (b"PK\x03\x04", "ZIP"),
    (b"\x89PNG", "PNG"), (b"\xff\xd8\xff", "JPEG"), (b"%PDF", "PDF"),
    (b"GIF8", "GIF"), (b"RIFF", "RIFF"), (b"OggS", "OGG"),
    (b"\x1f\x8b", "GZIP"), (b"BZh", "BZIP2"), (b"SQLite", "SQLite"),
]

def main():
    p = argparse.ArgumentParser(description="Rich hexdump")
    p.add_argument("file")
    p.add_argument("--offset", type=int, default=0)
    p.add_argument("--length", type=int, default=None)
    p.add_argument("--highlight")
    p.add_argument("--struct", action="store_true")
    a = p.parse_args()
    with open(a.file, "rb") as f:
        f.seek(a.offset)
        data = f.read(a.length)
    print(hexdump(data, a.offset, a.length, a.highlight))
    if a.struct:
        magic = data[:8]
        print("\n[STRUCT]")
        print(f"  Magic: {binascii.hexlify(magic).decode()}")
        for m, name in MAGICS:
            if data.startswith(m):
                print(f"  Detected: {name}")
                break

if __name__ == "__main__":
    main()
