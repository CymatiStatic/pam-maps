# 🗺️ pi-pam — Project Architectural Maps

> Living, multi-layer cartography for monorepos. A [Pi](https://pi.dev) skill that maintains visual maps, significance ratings, dependency graphs, and third-party repo evaluation — so every agent and every developer knows what each system does and how they connect.

## The Problem

Large codebases rot silently. README files go stale. New contributors can't find the entry point. AI agents hallucinate project relationships because nothing documents the actual architecture. One project gets renamed and three downstream systems break because nobody mapped the dependency.

**PAM fixes this.** It walks your monorepo, reads every README, and synthesizes a multi-layer map that stays current across sessions and agents.

## ✨ Features

- **Multi-layer maps** — Quick visual map (PAM_Master) → human-readable narrative (ReadMyAss) → deep architectural significance breakdown (ASS_MASTER)
- **Per-project slave files** — Each project gets its own significance rating, dependency list, and narrative
- **Third-party repo evaluation** — `/pam evaluate <github-url>` gives a verdict: ✅ ADDS VALUE · 🟡 MAYBE · 🔴 REDUNDANT · ⚠️ COULD CONFLICT · ⛔ NOT USEFUL
- **Pending log system** — Agents report PAM-significant changes to a lightweight JSONL log; PAM drains and folds them on next sync
- **Significance ratings** — 🔴 ASS (Architecturally System-Significant) vs 🟡 PASS (Project-Architecturally Semi-Significant) for every project
- **Deterministic scripts** — Node.js walkers and fetchers that produce structured JSON for the AI to synthesize
- **Pre-commit hook** — Warns when changes touch PAM-significant contracts
- **Template-driven** — All output files generated from Markdown templates

## 📦 Installation

```bash
pi install CymatiStatic/pi-pam
```

Or add to `~/.pi/agent/settings.json`:

```json
{
  "packages": ["github:CymatiStatic/pi-pam"]
}
```

Then copy the agent identity doc into your Pi config:
```bash
cp node_modules/pi-pam/agents/PAM.md ~/.pi/agent/agents/PAM.md
```

## 🚀 Usage

### Commands

| Command | What it does |
|---------|-------------|
| `/pam status` | Read-only: which projects have maps, what's stale, pending changes |
| `/pam sync` | Refresh master + slave map files (only re-syncs what changed) |
| `/pam sync --master-only` | Just the 3 monorepo-level files |
| `/pam sync --new-only` | Fill in projects without maps |
| `/pam sync <project>` | Refresh just one project |
| `/pam evaluate <github-url>` | Verdict on whether a third-party repo adds value |

### Example: Evaluate a repo

```
/pam evaluate https://github.com/anthropics/claude-code

╔══════════════════════════════════════════════╗
║  VERDICT: 🟡 MAYBE                          ║
║  anthropics/claude-code                      ║
╠══════════════════════════════════════════════╣
║  Overlap: 35% with existing Pi tooling       ║
║  Unique value: Official Anthropic patterns   ║
║  Risk: Could conflict with custom extensions ║
║  Recommendation: Clone for reference only    ║
╚══════════════════════════════════════════════╝
```

## 🔍 How it works

### Map hierarchy

```
<monorepo>/.pi/MAPS/
├── PAM_Master.md       ← Visual map of the whole tree (quick reference)
├── ReadMyAss.md        ← Human-readable narrative with Mermaid diagrams
└── ASS_MASTER.md       ← Deep architectural significance breakdown

<project>/.pi/MAPS/
├── PAM_Slave.md        ← This project's visual map
├── ASS_SLAVE.md        ← This project's significance + dependencies
├── PASS.md             ← Significance classification rationale
└── ReadMyAss.md        ← This project's narrative
```

### Significance ratings

| Rating | Meaning | Example |
|--------|---------|---------|
| 🔴 **ASS** | Architecturally System-Significant — removal breaks other systems | API gateway, shared auth |
| 🟡 **PASS** | Project-Architecturally Semi-Significant — self-contained, limited ripple | Internal tool, utility script |

### Scripts

| Script | Purpose |
|--------|---------|
| `scan-readmes.mjs` | Walk the monorepo, find every README, emit structured JSON |
| `fetch-repo-readme.mjs` | Fetch a GitHub repo's README + metadata via API (no clone) |
| `log-pending.mjs` | Append/read/drain the per-project pending change log |

### Pending log protocol

Any agent working in the monorepo can report PAM-significant changes:

```bash
node scripts/log-pending.mjs \
  --project my-api \
  --type contract-change \
  --summary "Changed default port from 3000 to 8080" \
  --ripple "frontend, reverse-proxy"
```

PAM drains the log on the next `/pam sync` and folds changes into the maps.

## 📁 Repo structure

```
pi-pam/
├── agents/PAM.md              ← PAM's identity and vocabulary
├── skills/pam/SKILL.md        ← /pam workflow (what to do when invoked)
├── scripts/
│   ├── scan-readmes.mjs       ← Monorepo walker
│   ├── fetch-repo-readme.mjs  ← GitHub repo fetcher
│   └── log-pending.mjs        ← Pending change logger
├── templates/                 ← Output file templates
├── prompts/pam.md             ← Slash command entry point
└── package.json
```

## ⚙️ Configuration

The `scan-readmes.mjs` script defaults to scanning the current working directory. Override with:

```bash
node scripts/scan-readmes.mjs /path/to/your/monorepo
```

PAM works with any monorepo structure — it reads READMEs to understand project roles, not framework-specific config files.

## 🤝 Contributing

PRs welcome! Areas that could use help:
- Additional output templates for different monorepo styles
- Language-specific significance heuristics
- Integration with other monorepo tools (Nx, Turborepo, etc.)

## 📄 License

[MIT](LICENSE) — built by [@CymatiStatic](https://github.com/CymatiStatic)
