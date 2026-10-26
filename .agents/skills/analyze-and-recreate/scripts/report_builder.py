#!/usr/bin/env python3
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
