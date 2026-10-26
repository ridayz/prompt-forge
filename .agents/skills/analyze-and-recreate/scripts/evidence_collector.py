#!/usr/bin/env python3
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
