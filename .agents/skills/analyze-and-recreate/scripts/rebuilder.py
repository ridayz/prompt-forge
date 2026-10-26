#!/usr/bin/env python3
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
