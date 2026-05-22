# 🗺️ PAM - Project Architectural Maps

> PAM is an anagram of MAP. That is intentional. The acronyms are load-bearing. So is your architecture — PAM finds out which parts are 🍑.

PAM scans your monorepo (or multi-repo system), reads every README and project structure, and tells you which parts are 🍑 **ASS** and which are just **PASS**.

## The Naming Convention

These are not jokes. They are the literal filenames.

| Term | Stands for | What it means |
|------|-----------|---------------|
| **PAM** | Project Architectural Maps | The tool itself |
| **MAP** | *(anagram of PAM)* | The visual file-tree artifact PAM generates |
| 🍑 **ASS** | Architectural System Significance | This project is load-bearing — remove it and other systems break |
| **PASS** | Project-Architectural Semi-Significance | Matters internally, but the rest of the system doesn't care if it disappears |
| 🍑 **ReadMyAss** | *(literal filename)* | Human-readable map with a *“You Are Here”* marker. Like a README, but for your architecture |

Your monorepo gets rated. Every project is either 🔴🍑 ASS (system-critical) or 🟡 PASS (self-contained). The ones that are both? That’s where you pay attention.

## The Problem

Nobody documents architecture. README files rot. New developers guess at relationships. AI agents hallucinate dependencies. One project gets renamed and three downstream systems break because nobody mapped the dependency graph.

PAM fixes this by generating a multi-layer map that actually stays current:

- **`ASS_MASTER.md`** 🍑 — The most important file. Which projects are architecturally significant, what depends on what, and what breaks if something disappears
- **`ReadMyAss.md`** - Human-readable narrative with Mermaid diagrams and a *"You Are Here"* breadcrumb
- **`PAM_Master.md`** - Quick visual tree with ⭐ markers on the load-bearing projects
- **`PASS.md`** - Per-project: what matters *inside* this project even if nobody else cares

## Third-Party Repo Evaluation

Drop in a link to any public repo, npm package, or tool and ask:

> *"Would this benefit my system?"*

PAM reads the repo, compares it against `ASS_MASTER.md` 🍑, and gives you a verdict:

| Verdict | Translation |
|---------|------------|
| ✅ **ADDS VALUE** | Real gap-fill. PAM names exactly where it slots in |
| 🟡 **MAYBE** | Some overlap. PAM names the conditional |
| 🔴 **REDUNDANT** | You already have something that does this |
| ⚠️ **COULD CONFLICT** | Port collision, hook overlap, or it'll step on something running |
| ⛔ **NOT USEFUL** | Wrong domain, wrong runtime, abandoned, doesn't fit |

Every verdict comes with rationale, touched systems, and a recommended action - not just a label.

## 📦 Install

```bash
npm install -g pam-maps
```

### Use with AI Coding Agents

PAM works with **any CLI agent** - Pi, Claude Code, Codex, Cursor, Aider, or standalone. Copy the skill files into your agent config:

```bash
# Pi
cp -r skills/ ~/.pi/agent/skills/
cp agents/PAM.md ~/.pi/agent/agents/

# Claude Code / Codex / others
cp -r skills/ ~/.claude/skills/    # or ~/.codex/skills/
```

Then use `/pam status`, `/pam sync`, or `/pam evaluate <url>` inside any session.

## 🚀 Usage

### CLI (standalone)

```bash
# Scan your monorepo → structured JSON of every project
pam-scan /path/to/your/monorepo

# Evaluate a third-party repo without cloning it
pam-fetch https://github.com/expressjs/express

# Log a change for the next sync
pam-log --project my-api --type contract-change \
        --summary "Changed default port from 3000 to 8080" \
        --ripple "frontend, reverse-proxy"
```

### Agent Commands

| Command | What it does |
|---------|-------------|
| `/pam status` | Which projects have maps, what's stale, pending changes |
| `/pam sync` | Regenerate all maps (cached - only re-syncs what changed) |
| `/pam sync <project>` | Refresh just one project's ASS/PASS/ReadMyAss files |
| `/pam evaluate <url>` | Verdict on a third-party repo against your 🍑 ASS_MASTER |

## 🔍 What PAM Generates

### Master Layer (whole system)

```
<monorepo>/.pi/MAPS/
├── ASS_MASTER.md  🍑   ← THE important file. Global significance breakdown.
│                         "What contributes to the system, what depends on what,
│                          what breaks if this disappears."
├── ReadMyAss.md        ← Human-readable narrative. Mermaid diagrams.
│                         "You Are Here" breadcrumb navigation.
└── PAM_Master.md       ← Quick visual tree. ⭐ = ASS, 🟡 = PASS, ⚪ = neither.
```

### Slave Layer (per-project)

```
<project>/.pi/MAPS/
├── ASS_SLAVE.md   🍑   ← Only the parts that affect OTHER systems.
│                         Hand-off points, shared contracts, ports, daemons.
├── PASS.md             ← What matters INSIDE this project.
│                         Hot paths, fragile glue, critical configs.
├── ReadMyAss.md        ← This project's narrative + its place in the graph.
└── PAM_Slave.md        ← Visual tree. ⭐ = files the program actually uses.
```

### Significance Ratings

| Rating | Meaning | Example |
|--------|---------|---------|
| 🔴🍑 **ASS** | Remove it and other systems break | Shared API gateway, auth service, message bus |
| 🟡 **PASS** | Self-contained - the system doesn't notice if it's gone | Internal CLI tool, standalone utility |
| 🔴🍑🟡 **Both** | Load-bearing *and* internally complex — pay attention here | Core service with fragile internal architecture |

## 📁 Repo Structure

```
pam-maps/
├── agents/PAM.md              ← PAM's identity, vocabulary, and rules
├── skills/pam/SKILL.md        ← The /pam workflow (for AI agent sessions)
├── scripts/
│   ├── scan-readmes.mjs       ← Walk a monorepo, emit structured JSON
│   ├── fetch-repo-readme.mjs  ← Fetch a GitHub repo's README via API (no clone)
│   └── log-pending.mjs        ← Append/read/drain the pending change log
├── templates/
│   ├── ASS_MASTER.template.md 🍑 ← Template for the global significance file
│   ├── ASS_SLAVE.template.md  🍑 ← Template for per-project significance
│   ├── PASS.template.md       ← Template for internal significance
│   ├── ReadMyAss_*.template.md 🍑 ← Templates for human-readable narratives
│   ├── PAM_*.template.md      ← Templates for visual maps
│   └── pre-commit-pam-check.sh ← Git hook: warns on ASS-significant changes
├── prompts/pam.md             ← Slash command entry point
└── package.json
```

## ⚙️ Configuration

```bash
# Set your monorepo root (or PAM defaults to cwd)
export PAM_ROOT=/path/to/your/monorepo
pam-scan

# Or pass it directly
pam-scan /path/to/monorepo
```

PAM reads READMEs to understand project roles. No Nx, Turborepo, or Lerna config required - any directory with a README is a project.

## 🤝 Contributing

PRs welcome. If your monorepo has a structure PAM doesn't handle well, open an issue.

## 📄 License

[MIT](LICENSE) - built by [@CymatiStatic](https://github.com/CymatiStatic)

---

<sub>🍑 Yes, you will have files named `ASS_MASTER.md` and `ReadMyAss.md` in your repo. Your coworkers will ask questions. That's a feature. 🍑</sub>
