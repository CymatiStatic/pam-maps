# 🗺️ PAM — Project Architectural Maps

> Living, multi-layer cartography for monorepos and multi-repo systems. PAM analyzes your repos and their subdirectories, identifies architecturally significant imports and connections, and maintains a map that stays current as your system evolves.

## The Problem

Large codebases rot silently. README files go stale. New contributors can't find the entry point. AI agents hallucinate project relationships because nothing documents the actual architecture. One project gets renamed and three downstream systems break because nobody mapped the dependency.

## What PAM Does

PAM scans your monorepo (or system of repos), reads every README and project structure, and synthesizes a **multi-layer map** of your entire system:

- **What each project does** and how it contributes to the whole
- **How projects connect** — dependencies, shared contracts, ports, file paths
- **What breaks if something disappears** — ripple analysis for every system
- **Significance ratings** — which projects are load-bearing (🔴 ASS) vs self-contained (🟡 PASS)

### Third-Party Repo Evaluation

Drop in a link to any public repo, npm package, tool, or application, and ask PAM:

> *"Would this benefit my system?"*

PAM reads the repo's README and metadata, compares it against its knowledge of your existing architecture, and responds with a structured verdict:

| Verdict | Meaning |
|---------|---------|
| ✅ **ADDS VALUE** | Fills a gap, no overlap with existing systems |
| 🟡 **MAYBE** | Some value, but overlap or integration cost to consider |
| 🔴 **REDUNDANT** | You already have something that does this |
| ⚠️ **COULD CONFLICT** | Risk of breaking existing contracts or conventions |
| ⛔ **NOT USEFUL** | Doesn't fit your architecture |

The verdict includes *why* — which existing projects overlap, what the integration points would be, and what would need to change.

## 📦 Installation

```bash
npm install -g pam-maps
```

Or clone and use directly:

```bash
git clone https://github.com/CymatiStatic/pam-maps.git
cd pam-maps
```

### Use with AI Coding Agents

PAM works with **any CLI-based AI agent** — Pi, Claude Code, Codex, Cursor, Aider, or anything else. Copy the skill and agent docs into your agent's config:

```bash
# Example: Pi
cp -r skills/ ~/.pi/agent/skills/
cp agents/PAM.md ~/.pi/agent/agents/

# Example: Claude Code
cp -r skills/ ~/.claude/skills/

# Example: Codex
cp -r skills/ ~/.codex/skills/
```

Then use `/pam status`, `/pam sync`, or `/pam evaluate <url>` from inside any session.

## 🚀 Usage

### CLI Scripts (standalone, no agent required)

```bash
# Scan your monorepo and emit structured JSON
pam-scan /path/to/your/monorepo

# Or with environment variable
PAM_ROOT=/path/to/monorepo pam-scan

# Fetch a GitHub repo's README + metadata (no clone needed)
pam-fetch https://github.com/expressjs/express

# Log a significant change for the next sync
pam-log --project my-api --type contract-change \
        --summary "Changed default port from 3000 to 8080" \
        --ripple "frontend, reverse-proxy"

# List pending changes across all projects
pam-log --counts

# Read pending changes for a project
pam-log --read --project my-api

# Drain (read + archive) pending changes
pam-log --drain --project my-api
```

### Agent Commands (inside any AI coding session)

| Command | What it does |
|---------|-------------|
| `/pam status` | Which projects have maps, what's stale, pending changes |
| `/pam sync` | Refresh master + slave map files (only re-syncs what changed) |
| `/pam sync --master-only` | Just the 3 monorepo-level files |
| `/pam sync --new-only` | Fill in projects without maps |
| `/pam sync <project>` | Refresh just one project |
| `/pam evaluate <github-url>` | Verdict on whether a third-party repo adds value |

## 🔍 How It Works

### Map Hierarchy

PAM generates two layers of documentation:

```
<monorepo>/.pi/MAPS/                    ← Master layer (whole system)
├── PAM_Master.md       Quick visual map of the entire tree
├── ReadMyAss.md        Human-readable narrative with Mermaid diagrams
└── ASS_MASTER.md       Deep architectural significance breakdown

<project>/.pi/MAPS/                     ← Slave layer (per-project)
├── PAM_Slave.md        This project's visual map
├── ASS_SLAVE.md        Significance rating + dependency list
├── PASS.md             Classification rationale
└── ReadMyAss.md        This project's narrative
```

### Significance Ratings

| Rating | Meaning | Example |
|--------|---------|---------|
| 🔴 **ASS** | Architecturally System-Significant — removal breaks other systems | Shared API gateway, auth service, message bus |
| 🟡 **PASS** | Project-Architecturally Semi-Significant — self-contained, limited ripple | Internal CLI tool, standalone utility |

### Pending Log Protocol

Any developer or AI agent can report significant changes without triggering a full resync:

```bash
pam-log --project my-api --type contract-change \
        --summary "REST endpoint /v2/users replaced /v1/users" \
        --files "src/routes.ts,openapi.yaml" \
        --ripple "frontend, mobile-app, docs"
```

PAM drains the log on the next `/pam sync` and folds changes into the maps.

Change types: `new-project` · `rename-project` · `delete-project` · `contract-change` · `new-dependency` · `dependency-removed` · `role-change` · `other`

### Scripts

| Script | Purpose |
|--------|---------|
| `scan-readmes.mjs` | Walk a monorepo root, find every README, emit structured JSON |
| `fetch-repo-readme.mjs` | Fetch a GitHub repo's README + metadata via API (no clone needed) |
| `log-pending.mjs` | Append/read/drain the per-project pending change log |

## 📁 Repo Structure

```
pam-maps/
├── agents/PAM.md              ← PAM's identity and vocabulary (for AI agents)
├── skills/pam/SKILL.md        ← Workflow definition (for AI agent sessions)
├── scripts/
│   ├── scan-readmes.mjs       ← Monorepo walker (standalone CLI)
│   ├── fetch-repo-readme.mjs  ← GitHub repo fetcher (standalone CLI)
│   └── log-pending.mjs        ← Pending change logger (standalone CLI)
├── templates/                 ← Output file templates (Markdown)
├── prompts/pam.md             ← Slash command entry point (optional)
└── package.json
```

## ⚙️ Configuration

Set `PAM_ROOT` environment variable to your monorepo root, or pass it as a CLI argument:

```bash
export PAM_ROOT=/path/to/your/monorepo
pam-scan                    # uses PAM_ROOT
pam-scan /other/path        # overrides PAM_ROOT
```

PAM works with any monorepo structure — it reads READMEs to understand project roles, not framework-specific config files. No Nx, Turborepo, or Lerna required.

## 🤝 Contributing

PRs welcome! Areas that could use help:
- Additional output templates for different monorepo styles
- Language-specific significance heuristics
- Integration guides for more AI agents

## 📄 License

[MIT](LICENSE) — built by [@CymatiStatic](https://github.com/CymatiStatic)
