import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

data = open(
    r"C:/Users/DONCUL-PC/AppData/Local/Programs/Intip/resources/app.asar", "rb"
).read()

# 1. Head/mascot SVG tags
for m in list(re.finditer(rb"<svg[^>]{0,200}head[^>]{0,80}>", data))[:6]:
    print("SVG-HEAD:", m.group()[:200])
print()

# 2. Peach fill usage
for m in list(re.finditer(rb"var\(--peach\)", data))[:10]:
    ctx = data[max(0, m.start() - 60):m.start() + 60]
    print("PEACH-CTX:", ctx)
print()

# 3. Where is the head drawn? Search "head" in JS builders
for m in list(re.finditer(rb"(function\s+\w*head\w*|const\s+\w*head\w*\s*=)", data, re.I))[:8]:
    print("HEAD-FN:", data[m.start():m.start() + 120])
print()

# 4. The .head CSS block (peek animation, size)
i = data.find(b".notch .head")
if i > 0:
    print(data[i:i + 900])
else:
    i = data.find(b".head {")
    print(data[i:i + 900])
