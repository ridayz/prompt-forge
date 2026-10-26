# ReCREATOR — Analyze, Rebuild, Bypass, Report

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
- Save evidence to: H:\Default Project\analysis\<target>\

## Constraints
- Only analyze artifacts the user owns or has legitimate access to
- Do not bypass live production security without authorization
- Evidence must be reproducible, not fabricated
- Respect confidentiality of analyzed targets
