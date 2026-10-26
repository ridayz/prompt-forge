#!/usr/bin/env python3
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
