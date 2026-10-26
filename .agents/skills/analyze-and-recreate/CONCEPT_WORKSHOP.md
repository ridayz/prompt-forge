# CONCEPT Workshop — How to Understand Anything

This is the CONCEPT module of ReCREATOR: how to take apart any system,
idea, or process and understand it completely.

---

## The Fundamental Question

Every system, no matter how complex, answers one question:

    "What goes in, what happens, what comes out?"

Everything else is detail. The 6-Layer framework fills in the detail.

---

## The 6 Layers — In Depth

### LAYER 1 — INPUTS

Ask:
- What starts this system?
- What data/energy/material/people enter?
- What conditions must be true before it runs?
- What triggers a state change?
- What is optional vs. required?
- What are the types, format, range of each input?

Example for LumivaraOnline:
  Input 1: Google OAuth token (auth)
  Input 2: Player commands (movement, attack, chat)
  Input 3: Real money (Gold purchase via Stripe)
  Input 4: Time (EXP gain, server uptime)

---

### LAYER 2 — PROCESSING

Ask:
- What transformations happen to inputs?
- What is the core algorithm/logic?
- What decisions are made? By what rules?
- What is the control flow? (conditionals, loops, state machine)
- What order must things happen in?
- What can run in parallel vs. must be sequential?
- What state is maintained between operations?

Example for LumivaraOnline combat:
  Player attacks -> server calculates damage using ATK, DEF,
  element, card slots, skill modifiers -> result applied to target HP
  -> loot dropped if HP=0 -> broadcast to party/all

---

### LAYER 3 — OUTPUTS

Ask:
- What does this system produce?
- Who or what receives the output?
- What side effects exist? (logs, state changes, network calls)
- What is the format of outputs?
- Can outputs become inputs to another process?
- What is the response time / latency?

Example for LumivaraOnline:
  Output 1: Game state update (HP, position, inventory)
  Output 2: Loot drop (Silver, items, cards)
  Output 3: Chat messages
  Output 4: Gold market orders
  Output 5: Stripe payment receipt

---

### LAYER 4 — DEPENDENCIES

Ask:
- Internal: what modules/functions/classes does this use?
- External: what services does this call?
- What infrastructure does it run on?
- What data does it read/write?
- What people/organizations are involved?
- What fails if a dependency fails?
- Are there circular dependencies?

Example for LumivaraOnline:
  Internal:  Game client (browser), session state, database
  External:  Cloudflare CDN, Google OAuth, Stripe, Discord
  Physical:  Server hardware, network backbone
  Legal:     Thailand VAT law, user agreement

---

### LAYER 5 — CONSTRAINTS

Ask:
- Physical constraints: CPU, memory, bandwidth, time
- Logical constraints: authentication, validation
- Business constraints: costs, permissions, legal limits
- What happens when a constraint is reached?
- What happens during overflow?
- What validation exists? What is missing?

Example for LumivaraOnline:
  Base Lv cap 120, Job Lv cap 70
  Party level gap max 20 before no EXP share
  Card slot = 1 per equipment piece
  Gold non-transferable after snapshot
  Premium required for market from Oct 25

---

### LAYER 6 — FAILURE MODES

Ask:
- What can go wrong?
- What is the most likely failure?
- What is the worst-case failure?
- What happens to outputs during failure?
- What is the recovery path?
- What is the blast radius?
- What can be exploited intentionally?

Example for LumivaraOnline:
  Lag / ping spikes -> missed inputs during combat
  Session drop -> character preserved, reconnect
  Data reset Oct 31 -> all progress wiped
  Over-enchant failure -> item destroyed, cards lost
  Card embed -> permanent, cannot be recovered

---

## Concept Analysis Patterns

### Pattern 1: API Analysis
    1. Capture all observed endpoints
    2. Map each to its function (read, write, auth, notify)
    3. Trace one complete transaction: request -> auth -> process -> response
    4. Identify missing auth checks on any endpoint
    5. Identify data leaks in responses

### Pattern 2: Game System Analysis
    1. Identify all mechanics (combat, economy, progression)
    2. Map the economy: what creates value, what consumes it
    3. Find the "golden path" - fastest progression route
    4. Find exploits: dupes, inflation, bypass progression
    5. Map reward vs. effort curves

### Pattern 3: Protocol Analysis
    1. Capture a clean session (login to logout)
    2. Identify all packet types
    3. Map state machine: what state triggers what packet
    4. Find the auth handshake
    5. Find the weakest link in the trust chain

### Pattern 4: Business System Analysis
    1. Map the money flow: who pays, who receives, what they get
    2. Identify all points where real money touches virtual goods
    3. Map refund/cancellation paths
    4. Find the monetization pressure points
    5. Identify regulatory compliance points

### Pattern 5: Binary Analysis
    1. Identify entry points (main, exports, callbacks)
    2. Map the import table
    3. Identify strings - hardcoded URLs, keys, error messages
    4. Trace the control flow from entry to key functions
    5. Map memory management - buffers, allocations, frees
    6. Find the crypto/auth/security-relevant functions

---

## Concept Verification Loop

Never stop at one pass. Verify your understanding:

    OBSERVE -> HYPOTHESIZE -> PREDICT -> TEST -> COMPARE -> REPEAT

    1. OBSERVE    - collect evidence from target
    2. HYPOTHESIZE - form a model of how it works
    3. PREDICT    - what will happen if I do X?
    4. TEST       - try to observe X (passively or with authorization)
    5. COMPARE    - does the result match prediction?
    6. REPEAT     - if mismatch, the model is wrong, go back

Example on LumivaraOnline:
    OBSERVE:     FAQ says Gold does not carry to real server
    HYPOTHESIZE: Gold is a session-scoped currency tied to EA server
    PREDICT:     If I buy Gold now and snapshot happens, Gold disappears
    TEST:        (cannot test without purchasing)
    RESULT:      Documentation confirms - Gold destroyed at snapshot

---

## Concept Report Template

    ## Concept: [Target Name]

    ### One-Line Description
    [What it is in one sentence]

    ### The 6 Layers
    #### 1. Inputs
    #### 2. Processing
    #### 3. Outputs
    #### 4. Dependencies (Internal / External)
    #### 5. Constraints
    #### 6. Failure Modes

    ### Key Insight
    [The most important thing]

    ### Unknowns
    [What we could not determine]

    ### Verdict
    [Safe / Risky / Exploitable - with justification]
