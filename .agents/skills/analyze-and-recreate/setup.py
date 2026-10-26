import os

base = r'H:\Default Project\.agents\skills\analyze-and-recreate'
scripts = os.path.join(base, 'scripts')
os.makedirs(scripts, exist_ok=True)

# ============ ReCREATOR.md ============
rm = """# ReCREATOR — Analyze, Rebuild, Bypass, Report

## Purpose
Deep inspection, concept analysis, reconstruction, bypass discovery,
evidence collection, and structured reporting.
Works on: files, code, binaries, data, APIs, protocols, configs, concepts.

## When to Load
Load when the user asks to:
- Inspect / Analyze / Check — deep dive into internals
- Rebuild / Recreate / Reconstruct — create a working version from analysis
- Bypass / Find a way around — workarounds, vulnerabilities, edge cases
- Report findings — structured evidence-backed reports
- Show evidence — prove claims with reproducible proof
Do NOT load for routine coding tasks.

---

## Core Modules

### INSPECT (dissect anything)
- Disassemble / decompile / parse / trace / fingerprint
- Magic bytes, hexdump, strings, entropy
- Binary structure, headers, sections, functions
- Network packets, protocol frames
- Source code flow analysis
- Concept decomposition

### CONCEPT (how anything works)
Every system has an architecture. CONCEPT breaks it down with the 6-Layer framework.
Apply to: APIs, games, protocols, codebases, businesses, physical systems.

The 6-Layer Concept Map:
  LAYER 1 INPUTS      - what drives it, triggers, preconditions
  LAYER 2 PROCESSING   - transformations, rules, control flow
  LAYER 3 OUTPUTS     - products, side effects, consumers
  LAYER 4 DEPENDENCIES - internal libs/modules, external services
  LAYER 5 CONSTRAINTS  - physical/logical/business limits
  LAYER 6 FAILURE     - what breaks, weakest link, edge cases

Analysis Techniques:
  Decomposition / Flow tracing / State modeling / Dependency mapping
  Inverse engineering / Constraint stress / Surface analysis

Verification Loop: OBSERVE -> HYPOTHESIZE -> PREDICT -> TEST -> COMPARE -> REPEAT
Never stop at one pass. If prediction fails, the model is wrong.

### REBUILD (recreate it)
- Clone: functional copy, same inputs/outputs
- Simplify: minimal core reproducing behavior
- Extend: original + new capabilities
- Port: translate to different language/platform
- Verify reconstruction before claiming success

### BYPASS (find ways around)
- Input manipulation: malformed, oversized, empty, edge cases
- Logic flaws: race conditions, TOCTOU, type confusion
- Auth bypass: token reuse, expired sessions, privilege escalation
- Check evasion: signature, checksum, anti-debug
- Rate limiting: IP rotation, header spoofing
- Constraint abuse: overflow, path traversal, format string
- Document: what tried / what happened / did it work

### EVIDENCE (prove everything)
- Raw bytes / hex of relevant sections
- Command outputs, logs, traces
- Before/after diffs, side-by-side comparisons
- Captured packets, screenshots, memory dumps
- Evidence must be reproducible, never fabricated

### REPORT (structured findings)
- Executive Summary: 1-3 sentences, severity, impact
- Methodology: tools and techniques used
- Findings: Confidence / Impact / Evidence / Details / Recommendation
- Bypass Paths: table with status and proof
- Reconstruction: code/config output + verification
- Appendix: raw evidence (hexdumps, traces, logs)

---

## Script Library

| Script | Purpose |
|--------|---------|
| hexdump.py | Rich hexdump with ASCII, offsets, struct hints |
| file_peek.py | Magic bytes, file type, entropy, strings |
| concept_map.py | Build structured concept maps |
| evidence_collector.py | Capture and organize evidence |
| report_builder.py | Assemble structured reports |
| bypass_tester.py | Systematic bypass path testing |
| rebuilder.py | Generate reconstruction from analysis |

---

## Output Rules

- Always show evidence, not just conclusions
- Cite specific addresses, offsets, line numbers, bytes
- Distinguish confirmed vs inferred
- Label assumptions clearly
- Include reproducible commands/scripts
- Save evidence to: H:\\Default Project\\analysis\\<target>\\

## Constraints
- Only analyze artifacts the user owns or has legitimate access to
- Do not bypass live production security without authorization
- Evidence must be reproducible, not fabricated
- Respect confidentiality of analyzed targets
"""

with open(os.path.join(base, 'ReCREATOR.md'), 'w', encoding='utf-8') as f:
    f.write(rm)
print("ReCREATOR.md OK")

# ============ scripts/hexdump.py ============
hexdump = r'''#!/usr/bin/env python3
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
'''

with open(os.path.join(scripts, 'hexdump.py'), 'w', encoding='utf-8') as f:
    f.write(hexdump)
print("hexdump.py OK")

# ============ scripts/file_peek.py ============
file_peek = r'''#!/usr/bin/env python3
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
'''

with open(os.path.join(scripts, 'file_peek.py'), 'w', encoding='utf-8') as f:
    f.write(file_peek)
print("file_peek.py OK")

# ============ scripts/concept_map.py ============
concept_map = r'''#!/usr/bin/env python3
"""concept_map.py - Build structured concept maps from analysis
Usage: py concept_map.py <input.txt> [--out JSON] [--out MD] [--depth N]
"""
import json, argparse, re, os
from collections import defaultdict

class ConceptMap:
    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_node(self, id, label, category, props=None):
        self.nodes[id] = {"label": label, "category": category, "props": props or {}}

    def add_edge(self, src, dst, rel):
        self.edges.append({"from": src, "to": dst, "rel": rel})

    def to_markdown(self):
        lines = ["# Concept Map\n"]
        cats = {}
        for nid, n in self.nodes.items():
            cats.setdefault(n["category"], []).append(n)
        for cat, nodes in sorted(cats.items()):
            lines.append(f"## {cat}\n")
            for n in nodes:
                lines.append(f"- **{n['label']}**")
                for k, v in n["props"].items():
                    lines.append(f"  - {k}: {v}")
        lines.append("\n## Relations\n")
        for e in self.edges:
            s = self.nodes.get(e["from"], {}).get("label", e["from"])
            d = self.nodes.get(e["to"], {}).get("label", e["to"])
            lines.append(f"- {s} --[{e['rel']}]--> {d}")
        return "\n".join(lines)

    def to_json(self):
        return {"nodes": self.nodes, "edges": self.edges}

def extract_keywords(text, top=30):
    stop = {"the","a","an","is","are","was","were","be","been","being","to","of","in","on","at","for","with","by","from","as","and","or","but","if","then","else","not","no","yes","can","will","would","could","should","may","might","must","shall","do","does","did","have","has","had","i","you","he","she","it","we","they","this","that","these","those","my","your","his","her","its","our","their","what","which","who","whom","where","when","why","how"}
    words = re.findall(r"[a-zA-Z_][a-zA-Z0-9_-]{2,}", text.lower())
    freq = {}
    for w in words:
        if w.lower() not in stop:
            freq[w] = freq.get(w, 0) + 1
    return sorted(freq.items(), key=lambda x: -x[1])[:top]

def main():
    p = argparse.ArgumentParser(description="Build structured concept map from text")
    p.add_argument("input", help="Text file with analysis notes or source")
    p.add_argument("--out", help="Output file (json or md based on extension)")
    p.add_argument("--top", type=int, default=30, help="Max keywords")
    a = p.parse_args()

    with open(a.input, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()

    kw = extract_keywords(text, a.top)
    cm = ConceptMap()
    cm.add_node("root", "Target", "SYSTEM")
    for word, cnt in kw:
        cid = f"k_{word}"
        cm.add_node(cid, word, "CONCEPT", {"mentions": cnt})
        cm.add_edge("root", cid, "contains")

    md = cm.to_markdown()
    print(md)

    if a.out:
        if a.out.endswith(".json"):
            with open(a.out, "w", encoding="utf-8") as f:
                json.dump(cm.to_json(), f, indent=2)
        else:
            with open(a.out, "w", encoding="utf-8") as f:
                f.write(md)
        print(f"\nSaved: {a.out}")

if __name__ == "__main__":
    main()
'''

with open(os.path.join(scripts, 'concept_map.py'), 'w', encoding='utf-8') as f:
    f.write(concept_map)
print("concept_map.py OK")

# ============ scripts/evidence_collector.py ============
evidence_collector = r'''#!/usr/bin/env python3
"""evidence_collector.py - Capture and organize evidence from analysis
Usage: py evidence_collector.py [--dir H:\Default Project\analysis\<target>] [--capture CMD]
"""
import os, json, hashlib, subprocess, argparse, datetime

class Evidence:
    def __init__(self, base_dir):
        self.base = base_dir
        os.makedirs(self.base, exist_ok=True)
        self.log = []

    def capture(self, label, content, kind="text"):
        entry = {"label": label, "kind": kind, "ts": datetime.datetime.now().isoformat()}
        if kind == "text":
            fname = f"{len(self.log):03d}_{label.replace(' ', '_')}.txt"
            with open(os.path.join(self.base, fname), "w", encoding="utf-8") as f:
                f.write(content)
        elif kind == "json":
            fname = f"{len(self.log):03d}_{label.replace(' ', '_')}.json"
            with open(fname, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2)
        elif kind == "hex":
            fname = f"{len(self.log):03d}_{label.replace(' ', '_')}.hex"
            with open(fname, "w") as f:
                f.write(content)
        elif kind == "bytes":
            fname = f"{len(self.log):03d}_{label.replace(' ', '_')}.bin"
            with open(fname, "wb") as f:
                f.write(content)
        entry["file"] = fname
        self.log.append(entry)
        print(f"[EVIDENCE] {label} -> {fname}")

    def capture_cmd(self, label, cmd):
        r = os.popen(cmd).read()
        self.capture(label, f"$ {cmd}\n{r}", kind="text")
        return r

    def hash_file(self, filepath, algo="sha256"):
        import hashlib
        h = hashlib.new(algo)
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()

    def save_index(self):
        with open(os.path.join(self.base, "evidence_index.json"), "w") as f:
            json.dump(self.log, f, indent=2)

def main():
    p = argparse.ArgumentParser(description="Evidence collection and organization")
    p.add_argument("--dir", default=r"H:\Default Project\analysis", help="Output dir")
    p.add_argument("--target", required=True, help="Target name (creates subdir)")
    a = p.parse_args()
    ev = Evidence(os.path.join(a.dir, a.target))
    print(f"Evidence dir ready: {ev.base}")

if __name__ == "__main__":
    main()
'''

with open(os.path.join(scripts, 'evidence_collector.py'), 'w', encoding='utf-8') as f:
    f.write(evidence_collector)
print("evidence_collector.py OK")

# ============ scripts/report_builder.py ============
report_builder = r'''#!/usr/bin/env python3
"""report_builder.py - Assemble structured analysis reports
Usage: py report_builder.py --title "Report" --findings findings.json --out report.md
"""
import json, argparse, datetime

def build_report(title, findings, bypass=None, recon=None, evidence=None, methodology=None):
    lines = []
    lines.append(f"# {title} — Analysis Report\n")
    lines.append(f"**Date:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}\n")

    lines.append("## Executive Summary\n")
    if findings:
        crit = sum(1 for f in findings if f.get("impact", "").lower() == "critical")
        high = sum(1 for f in findings if f.get("impact", "").lower() == "high")
        lines.append(f"{len(findings)} finding(s). Critical: {crit}, High: {high}.\n")

    if methodology:
        lines.append("## Methodology\n")
        lines.append(methodology + "\n")

    lines.append("## Findings\n")
    for i, f in enumerate(findings, 1):
        lines.append(f"### Finding {i} — {f.get('title', 'Untitled')}\n")
        lines.append(f"**Confidence:** {f.get('confidence', 'Medium')}")
        lines.append(f"**Impact:** {f.get('impact', 'Unknown')}")
        lines.append(f"**Evidence:** {f.get('evidence', 'N/A')}")
        lines.append(f"**Details:** {f.get('details', 'N/A')}")
        lines.append(f"**Recommendation:** {f.get('recommendation', 'N/A')}\n")

    if bypass:
        lines.append("## Bypass Paths\n")
        lines.append("| Path | Status | Evidence |")
        lines.append("|------|--------|----------|")
        for b in bypass:
            lines.append(f"| {b.get('method', '?')} | {b.get('status', '?')} | {b.get('evidence', 'N/A')} |")
        lines.append("")

    if recon:
        lines.append("## Reconstruction\n")
        lines.append(f"**Output:** {recon.get('output', 'N/A')}")
        lines.append(f"**Verification:** {recon.get('verification', 'N/A')}\n")

    if evidence:
        lines.append("## Appendix — Raw Evidence\n")
        for e in evidence:
            lines.append(f"- {e}")

    return "\n".join(lines)

def main():
    p = argparse.ArgumentParser(description="Build structured analysis report")
    p.add_argument("--title", required=True)
    p.add_argument("--findings", required=True, help="JSON file with findings array")
    p.add_argument("--bypass", help="JSON file with bypass paths")
    p.add_argument("--recon", help="JSON file with reconstruction info")
    p.add_argument("--evidence", nargs="*", help="Evidence file paths")
    p.add_argument("--methodology", help="Methodology description")
    p.add_argument("--out", required=True, help="Output markdown file")
    a = p.parse_args()

    with open(a.findings, "r", encoding="utf-8") as f:
        findings = json.load(f)

    bypass = json.load(open(a.bypass)) if a.bypass else None
    recon = json.load(open(a.recon)) if a.recon else None

    report = build_report(a.title, findings, bypass, recon, a.evidence, a.methodology)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"Report saved: {a.out}")

if __name__ == "__main__":
    main()
'''

with open(os.path.join(scripts, 'report_builder.py'), 'w', encoding='utf-8') as f:
    f.write(report_builder)
print("report_builder.py OK")

# ============ scripts/bypass_tester.py ============
bypass_tester = r'''#!/usr/bin/env python3
"""bypass_tester.py - Systematic bypass path testing framework
Usage: py bypass_tester.py --target <url-or-file> --category <cat> [--all]
"""
import argparse, json, os, sys, datetime

CATEGORIES = {
    "input": [
        "malformed_payload", "oversized_payload", "empty_payload",
        "null_bytes", "unicode_edge_cases", "format_string",
    ],
    "logic": [
        "race_condition", "toctou", "type_confusion",
        "integer_overflow", "buffer_overflow", "off_by_one",
    ],
    "auth": [
        "token_reuse", "expired_session", "privilege_escalation",
        "missing_auth_check", "weak_token_entropy", "jwt_manipulation",
    ],
    "evasion": [
        "signature_bypass", "checksum_bypass", "anti_debug",
        "vm_detection", "sandbox_evasion", "polymorphic_code",
    ],
    "ratelimit": [
        "ip_rotation", "header_spoofing", "distributed_requests",
        "slow_requests", "cache_poisoning", "request_smuggling",
    ],
    "constraint": [
        "path_traversal", "command_injection", "sql_injection",
        "xxe_injection", "deserialization", "ssrf",
    ],
}

def run_test(name, target):
    """Placeholder - actual test logic is context-specific."""
    return {
        "test": name,
        "target": target,
        "status": "NOT_IMPLEMENTED",
        "note": "Implement per-target logic",
        "ts": datetime.datetime.now().isoformat(),
    }

def main():
    p = argparse.ArgumentParser(description="Systematic bypass path testing")
    p.add_argument("--target", required=True)
    p.add_argument("--category", choices=list(CATEGORIES.keys()))
    p.add_argument("--all", action="store_true", help="Run all categories")
    p.add_argument("--out", help="Save results to JSON")
    a = p.parse_args()

    results = []
    cats = list(CATEGORIES.keys()) if a.all else ([a.category] if a.category else [])
    for cat in cats:
        print(f"\n[{cat.upper()}]")
        for test in CATEGORIES[cat]:
            r = run_test(test, a.target)
            print(f"  {test}: {r['status']}")
            results.append({"category": cat, **r})

    if a.out:
        with open(a.out, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved: {a.out}")

if __name__ == "__main__":
    main()
'''

with open(os.path.join(scripts, 'bypass_tester.py'), 'w', encoding='utf-8') as f:
    f.write(bypass_tester)
print("bypass_tester.py OK")

# ============ scripts/rebuilder.py ============
rebuilder = r'''#!/usr/bin/env python3
"""rebuilder.py - Generate reconstruction from analysis findings
Usage: py rebuilder.py --findings analysis.json --level clone --out rebuilt/
"""
import json, os, argparse, datetime

LEVELS = {
    "clone":    "Functional copy, same inputs/outputs",
    "simplify": "Minimal core reproducing behavior",
    "extend":   "Original + new capabilities",
    "port":     "Translation to different language/platform",
}

def generate_stub(findings, level, out_dir):
    """Generate a reconstruction stub from findings."""
    os.makedirs(out_dir, exist_ok=True)
    meta = {
        "generated": datetime.datetime.now().isoformat(),
        "level": level,
        "findings_count": len(findings),
        "description": LEVELS.get(level, "unknown"),
    }
    with open(os.path.join(out_dir, "reconstruction_manifest.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Reconstruction stub: {out_dir}")
    print(f"  Level: {level} - {LEVELS.get(level, '?')}")

LEVELS = {
    "clone": "Functional copy, same inputs/outputs",
    "simplify": "Minimal core reproducing behavior",
    "extend": "Original + new capabilities",
    "port": "Translation to different language/platform",
}

def main():
    p = argparse.ArgumentParser(description="Generate reconstruction from analysis")
    p.add_argument("--findings", required=True, help="JSON findings file")
    p.add_argument("--level", choices=list(LEVELS.keys()), default="clone")
    p.add_argument("--out", required=True, help="Output directory")
    a = p.parse_args()

    with open(a.findings, "r", encoding="utf-8") as f:
        findings = json.load(f)

    generate_stub(findings, a.level, a.out)

if __name__ == "__main__":
    main()
'''

with open(os.path.join(scripts, 'rebuilder.py'), 'w', encoding='utf-8') as f:
    f.write(rebuilder)
print("rebuilder.py OK")

print("\n=== ALL FILES WRITTEN ===")
