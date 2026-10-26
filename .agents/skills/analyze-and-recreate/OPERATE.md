_recreator_operate_
file:OPERATE.md

# ReCREATOR — How to Operate

## Loading the Skill

The AI agent loads this automatically when you ask to analyze, rebuild,
bypass, inspect, or investigate anything.
Just tell the agent what you want to break apart / understand / recreate.

---

## Quick Command Reference

### INSPECT — Dissect Anything

    py hexdump.py target.bin --offset 0 --length 256 --struct
    py file_peek.py target.bin --all
    py file_peek.py target.bin --strings --min-len 8
    py file_peek.py target.bin --entropy --out result.json

### CONCEPT — Map the Idea

    py concept_map.py notes.txt --top 50 --out concept.md
    py concept_map.py source.c --out concept.json

### EVIDENCE — Collect Proof

    py evidence_collector.py --target mytarget --dir "H:\Default Project\analysis"

### BYPASS — Test Paths

    py bypass_tester.py --target http://target.local --all --out bypass.json
    py bypass_tester.py --target http://target.local --category auth --out bypass.json

### REPORT — Build Structured Report

    py report_builder.py --title "Target" --findings findings.json --out report.md

### REBUILD — Reconstruct from Analysis

    py rebuilder.py --findings findings.json --level clone --out rebuilt/
    py rebuilder.py --findings findings.json --level simplify --out rebuilt_min/

---

## Full Workflow

    1. INSPECT
       py hexdump.py target.bin --struct > hex.txt
       py file_peek.py target.bin --all > peek.txt

    2. CONCEPT
       py concept_map.py hex.txt --out map.md

    3. ANALYZE (AI agent does this)
       Map logic, data flow, dependencies
       Identify constraints and failure modes
       Find bypass paths

### CONCEPT WORKFLOW — how to work any concept

    Step 1  GATHER
            Collect everything available: source, dumps, logs, screenshots,
            API responses, config, behavior notes.

    Step 2  DECOMPOSE
            Split the target into its 6 layers:
            Inputs -> Processing -> Outputs
            Dependencies -> Constraints -> Failure Modes

    Step 3  TRACE
            Follow one real request/transaction from entry to exit.
            Document every hop, every transformation.

    Step 4  MAP
            Build the concept map with concept_map.py
            py concept_map.py <collected_notes> --out concept.md

    Step 5  STRESS
            Identify the tightest constraint. Ask: what happens at the limit?

    Step 6  VERIFY
            Predict one behavior, then confirm it against evidence.
            If prediction fails, the model is wrong - go back to Step 2.

    Loop 3-6 until prediction matches observation.

    4. EVIDENCE
       py evidence_collector.py --target target --dir "H:\Default Project\analysis"

    5. REPORT
       py report_builder.py --title "Target" --findings findings.json --out report.md

    6. REBUILD
       py rebuilder.py --findings findings.json --level clone --out rebuilt/

---

## File Index

| File | Purpose |
|------|---------|
| ReCREATOR.md | Skill definition — what the AI knows |
| OPERATE.md | This file — how to use the tools |
| setup.py | Installer — regenerates all files |
| hexdump.py | Rich hex viewer with struct hints |
| file_peek.py | Magic bytes / type / entropy / strings |
| concept_map.py | Concept extraction from text |
| evidence_collector.py | Evidence gathering |
| report_builder.py | Assemble structured reports |
| bypass_tester.py | Systematic bypass testing |
| rebuilder.py | Reconstruction from analysis |

---

## Output Locations

    Evidence: H:\Default Project\analysis\<target>\
    Rebuilds: H:\<level>_<target>\
