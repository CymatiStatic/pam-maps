# PAM Maps — Release / Demo Post

Primary target: **r/pi-coding-agent**
Adaptable for: r/ClaudeAI, r/cursor, r/LocalLLaMA, r/programming, HN Show, X/Twitter thread.

---

## 🅿️ PRIMARY POST — r/pi-coding-agent

**Title options (pick one):**

- `Meet PAM. She's my librarian, my cartographer, and she really loves ass.`
- `I built a tool that rates every project in my monorepo as ASS or PASS. It works.`
- `PAM Maps: the only npm package that will put a file called ASS_MASTER.md in your repo (on purpose)`

---

**Body:**

I'd like you to meet **Pam**.

Pam is my **librarian** — she reads every README in my monorepo, knows where everything lives, knows which projects are abandoned, which got renamed three times, and which one Past-Me swore was "temporary" in 2023.

Pam is my **cartographer** — she draws the map. Not the lying kind your `tree` command prints. The real one: which projects are load-bearing, which are decorative, who depends on whom, and what catches fire if you delete the "small utility folder" nobody's touched in six months.

And Pam… really loves ass.

Specifically: **A**rchitectural **S**ystem **S**ignificance.

The acronyms are load-bearing. So is your architecture. PAM finds out which parts are 🍑.

---

### The bit where it's actually useful

Every project in your repo gets rated:

| Rating | Meaning |
|--------|---------|
| 🔴🍑 **ASS** | Architectural System Significance — remove it and other systems break. The API gateway. The auth service. The shared message bus. |
| 🟡 **PASS** | Project-Architectural Semi-Significance — matters internally, but the rest of the system doesn't notice if it disappears. Your one-off CLI tool. That standalone migrator. |
| 🔴🍑🟡 **Both** | Load-bearing *and* internally fragile. This is where you pay attention. |

PAM writes the verdicts to actual files. With actual filenames:

```
<monorepo>/.pi/MAPS/
├── ASS_MASTER.md   🍑   ← global significance: what depends on what, what breaks if it disappears
├── ReadMyAss.md          ← human-readable narrative + Mermaid diagrams + "You Are Here" breadcrumb
└── PAM_Master.md         ← visual tree, ⭐ on the load-bearing nodes

<project>/.pi/MAPS/
├── ASS_SLAVE.md    🍑   ← only the parts that affect OTHER systems (ports, contracts, daemons)
├── PASS.md               ← only the parts that matter INSIDE this project
├── ReadMyAss.md          ← this project's place in the graph
└── PAM_Slave.md          ← visual tree of files the program actually uses
```

Yes, your coworkers will ask questions. Yes, your AI agent will refer to `ReadMyAss.md` in standups. That's a feature.

---

### The problem it actually solves

I have ~30 projects in one monorepo. README files rot. New collaborators (and every coding agent I've ever used) hallucinate dependencies. I renamed one shared service last month and broke three downstream things because nobody, *including me*, had mapped the dependency graph.

PAM solves this by:

1. **Scanning every README** in the monorepo and extracting role/purpose/contracts.
2. **Maintaining a multi-layer map** — global (`ASS_MASTER`) + per-project (`ASS_SLAVE` / `PASS`) — that stays in sync via a pending-change log and `/pam sync`.
3. **Evaluating third-party repos before you install them.** Drop in any GitHub URL → PAM reads the repo, compares against your `ASS_MASTER`, returns one of:

   | Verdict | Translation |
   |---------|-------------|
   | ✅ **ADDS VALUE** | Real gap-fill. Names exactly where it slots in. |
   | 🟡 **MAYBE** | Some overlap. Names the conditional. |
   | 🔴 **REDUNDANT** | You already have something that does this. |
   | ⚠️ **COULD CONFLICT** | Port collision, hook overlap, or it'll step on something running. |
   | ⛔ **NOT USEFUL** | Wrong domain, wrong runtime, abandoned, doesn't fit. |

   Every verdict comes with rationale + touched systems + recommended action, not just a label.

---

### Demo

```bash
$ npm install -g pam-maps

$ pam-scan ~/Dev/CymaticAPPS
→ Found 31 projects. 7 ASS, 18 PASS, 6 unrated.

$ pam-fetch https://github.com/some-random/cool-mcp-server
→ Verdict: ⚠️ COULD CONFLICT
  Reason: Binds port 5174. AdHush backend already owns 5174.
  Action: Pin to alt port OR pick a different MCP server.
```

Inside a coding-agent session:

```
> /pam sync
> /pam evaluate https://github.com/expressjs/express
> /pam status
```

---

### Works with any agent

Pi, Claude Code, Codex, Cursor, Aider, or standalone CLI. Skill files drop into the agent's skills folder:

```bash
# Pi
cp -r skills/ ~/.pi/agent/skills/
cp agents/PAM.md ~/.pi/agent/agents/

# Claude Code / Codex / Cursor
cp -r skills/ ~/.claude/skills/   # or ~/.codex/skills/, ~/.cursor/skills/
```

Then `/pam status`, `/pam sync`, `/pam evaluate <url>` inside any session.

---

**Repo:** https://github.com/CymatiStatic/pam-maps
**npm:** `npm install -g pam-maps` (currently v0.2.3)
**License:** MIT

Built because I got tired of my coding agent confidently inventing import paths between projects that have never spoken to each other.

PRs welcome. Issues welcome. Jokes about the filename welcome — but the filename stays. It's load-bearing.

🍑

---

## ✂️ VARIANT — HN Show / r/programming (drop the ass jokes, keep the structure)

**Title:** `Show HN: PAM Maps — living architectural cartography for monorepos`

PAM scans your monorepo, reads every README, and maintains a multi-layer map of which projects are architecturally significant, what depends on what, and what breaks if something disappears.

It generates:

- A global significance file (`ASS_MASTER.md` — Architectural System Significance) listing load-bearing projects and their cross-project contracts.
- Per-project files for both external-facing significance and internal-only significance.
- Human-readable narratives with Mermaid diagrams and "You Are Here" breadcrumbs.
- A third-party repo evaluator: drop in any GitHub URL → verdict (`ADDS VALUE` / `MAYBE` / `REDUNDANT` / `COULD CONFLICT` / `NOT USEFUL`) with rationale.

Works as a standalone CLI (`pam-scan`, `pam-fetch`, `pam-log`) or as a skill loaded into any coding agent (Pi, Claude Code, Codex, Cursor).

The naming is intentionally undignified. The architecture isn't. https://github.com/CymatiStatic/pam-maps

---

## 🐦 VARIANT — X / Twitter thread (8 posts)

**1/** I built a tool that scans every README in my monorepo and rates each project as either 🍑 ASS or 🟡 PASS.

The acronyms are load-bearing. So is the architecture.

Meet PAM. 🧵

**2/** PAM = Project Architectural Maps.
ASS = Architectural System Significance.
PASS = Project-Architectural Semi-Significance.

Your monorepo gets a verdict. Per project. With receipts.

**3/** The problem: README files rot. Coding agents hallucinate dependencies. You rename one shared service and three downstream things break because nobody mapped the graph.

**4/** PAM maintains a multi-layer map that stays current:

ASS_MASTER.md → global significance
ASS_SLAVE.md → per-project, externally visible
PASS.md → per-project, internal only
ReadMyAss.md → human-readable with Mermaid + "You Are Here"

Yes those are the real filenames.

**5/** Bonus feature: third-party repo evaluation.

Drop in any GitHub URL → PAM compares it against your ASS_MASTER → returns:

✅ ADDS VALUE
🟡 MAYBE
🔴 REDUNDANT
⚠️ COULD CONFLICT
⛔ NOT USEFUL

with rationale and recommended action.

**6/** Works with any coding agent: Pi, Claude Code, Codex, Cursor, Aider. Drop the skill files in, get `/pam sync`, `/pam evaluate`, `/pam status`.

**7/** Also a standalone CLI:

`npm install -g pam-maps`
`pam-scan ~/your-monorepo`
`pam-fetch https://github.com/some/repo`

**8/** Repo: https://github.com/CymatiStatic/pam-maps

MIT. v0.2.3. Built because my agent kept inventing imports between projects that have never spoken.

The filename stays. It's load-bearing.

🍑
