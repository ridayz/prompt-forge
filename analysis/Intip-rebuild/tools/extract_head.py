import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

data = open(
    r"C:/Users/DONCUL-PC/AppData/Local/Programs/Intip/resources/app.asar", "rb"
).read()

i = data.find(b"const HEAD = {")
print(data[i:i + 700].decode("utf-8", "replace"))
print()

for probe in [b"function karakter", b"karakter =", b"karakter:"]:
    k = data.find(probe)
    print(probe, "->", hex(k) if k > 0 else "none")
    if k > 0:
        print(data[k:k + 2200].decode("utf-8", "replace"))
        print("...")
        break

# also: what draws the head svg in index.html (id="head")
m = data.find(b'id="head"')
print("id=head at", hex(m) if m > 0 else "none")
if m > 0:
    print(data[m - 400:m + 700].decode("utf-8", "replace"))
