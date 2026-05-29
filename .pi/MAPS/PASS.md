# 🏛️ PASS — pam-maps

> **Project's Architectural System Significance — Internal perspective.**
>
> This file describes what matters *inside* `pam-maps` regardless
> of whether anyone else cares. Hot paths, fragile glue, critical configs,
> the things you'd lose sleep over if they broke.
>
> Compare to [`ASS_SLAVE.md`](./ASS_SLAVE.md), which only covers things
> that affect the global system. The two often overlap but not always —
> the intersection is where the most attention should go.

**Last synced:** `2026-05-29`

---

## Internal architecture summary

A **minimal Node.js package** with three layers:

1. **Agent skill** (`skills/pam/`) — `/pam` slash command for Pi and other agents
2. **CLI scripts** (`scripts/`) — standalone Node scripts for scanning, fetching, logging
3. **Templates** (`templates/`) — Markdown files with placeholder syntax for map generation

No app server, no database, no runtime. Pure text generation + file I/O.

```
pam-maps/
├── agents/PAM.md           ← identity + vocabulary (read by agents)
├── skills/pam/
│   ├── SKILL.md            ← /pam workflow (read by agent framework)
│   ├── scripts/
│   │   ├── scan-readmes.mjs         ← walk monorepo, output JSON
│   │   ├── fetch-repo-readme.mjs    ← GitHub API fetch, no clone
│   │   └── log-pending.mjs          ← JSONL append/read
│   ├── templates/          ← .md files with {{PLACEHOLDER}} syntax
│   └── prompts/pam.md      ← agent entry point
└── package.json            ← main + bin shims
```

## Hot paths (most-traveled code paths)

1. **`/pam sync` command** → `scan-readmes.mjs` → walk project tree → output JSON
   - **Why it matters:** Primary use case; must be fast even for large monorepos
   - **Typical traffic:** Run once per session, or on-demand after project changes
   - **Failure mode:** Scan times out or returns incomplete data; maps are stale or partial

2. **Template rendering** (when generating `PAM_Slave.md`, etc.)
   - Agent reads template, fills placeholders with data, writes file
   - **Typical traffic:** Every `/pam sync <project>` invocation
   - **Failure mode:** Placeholder not filled (typo in template), file corrupted

3. **`/pam evaluate <url>`** → `fetch-repo-readme.mjs` → GitHub API call → verdict
   - **Why it matters:** External eval of third-party repos; must be responsive
   - **Typical traffic:** On-demand when evaluating a new package
   - **Failure mode:** GitHub API rate-limit hit; fetch fails; user gets no verdict

## Fragile glue (things that break when poked sideways)

1. **Template placeholder syntax** (`{{PLACEHOLDER}}`)
   - Each template uses specific placeholder names (e.g., `{{PROJECT_NAME}}`, `{{STACK}}`, `{{SCANNED_AT}}`)
   - **Fragility:** If placeholder name is misspelled in template, it won't be filled; file will contain literal `{{TYPO}}`
   - **Fix:** Add a build-time check that all placeholders in a template are documented; highlight missing keys

2. **GitHub API fetch** (unauthenticated)
   - `fetch-repo-readme.mjs` calls GitHub API without authentication
   - **Fragility:** Unauthenticated API has aggressive rate limits (60 req/hr per IP). Heavy use of `/pam evaluate` hits limits
   - **Fix:** Support optional GitHub token via env var; use authenticated limits (5000 req/hr per user)

3. **JSONL append format** (log-pending.mjs)
   - Pending changes are logged as JSONL (one JSON object per line)
   - **Fragility:** If a log line is malformed JSON, reading the log fails
   - **Fix:** Add defensive parsing + skip malformed lines with a warning

4. **README path assumptions**
   - `scan-readmes.mjs` assumes each project has a top-level `README.md`
   - **Fragility:** If a project has `readme.md` (lowercase) or no README, it's skipped
   - **Fix:** Case-insensitive search for README.* files

5. **Mirror sync with `~/.pi/agent/skills/pam/`**
   - pam-maps is the source of truth; the live copy is the mirror
   - **Fragility:** If the mirror drifts (someone edits it directly), breaking changes go unnoticed
   - **Fix:** Document the sync process clearly; add a pre-commit check to prevent direct edits to the mirror

## Critical configs

| Config | Purpose | Failure mode if wrong |
|--------|---------|----------------------|
| `package.json` `bin` shims | Declares CLI commands for global install | `pam-scan` / `pam-log` / `pam-fetch` not available after `npm install -g pam-maps` |
| Template files (`.template.md`) | Placeholder specs for map generation | Maps generated with missing/wrong data; `{{PLACEHOLDER}}` appears in output |
| `agents/PAM.md` | Vocabulary + rules (read by agents) | Agents are confused about ASS/PASS; documentation is inaccurate |
| `skills/pam/SKILL.md` | Agent workflow specification | Agent framework doesn't know how to run `/pam` command |

## Internal contracts (within this project)

1. **Placeholder syntax in templates**
   - Format: `{{PLACEHOLDER_NAME}}`
   - Used in all `.template.md` files
   - Must be unique within a template (same placeholder filled everywhere)
   - **Contract:** Placeholder names are fixed; renaming requires version bump

2. **JSONL schema for pending log**
   - Format: one JSON object per line (no newlines inside objects)
   - Required fields: `ts` (ISO8601), `agent`, `project`, `type`, `summary`
   - Optional fields: `files`, `ripple`, `details`
   - **Contract:** Adding required fields is a breaking change; optional fields can be added freely

3. **GitHub API response shape**
   - `fetch-repo-readme.mjs` expects `content` + `encoding` from GitHub API
   - **Contract:** If GitHub API changes response shape, the fetch fails (gracefully, with error)

## Overlap with `ASS_SLAVE.md`

The following things are BOTH project-internal AND globally significant:

- **Template schemas** — Used globally for map generation; breaking template changes break all maps
- **Vocabulary** (ASS/PASS/etc.) — Fixed; renaming requires coordinated changes across the monorepo
- **CLI scripts** — Breaking flag changes affect any team using pam-maps globally

## Things that matter to this project but NOT globally

- **README content** — Local documentation; doesn't affect other systems
- **CLI script implementation details** — How `scan-readmes.mjs` walks the tree; only matters internally
- **JSONL append logic** — Internal state management; doesn't affect external consumers
- **GitHub API client** — Internal implementation; wrapped by the public `fetch-repo-readme` CLI

## Notes for future-Ben

1. **Rate limit improvement:** Add GitHub token support (env var `PAM_GITHUB_TOKEN`). Unauthenticated limits are too tight for active repo evaluation.

2. **Template versioning:** If templates change structure, bump a major version. External teams using pam-maps CLI need predictable stability.

3. **Test coverage:** Add smoke tests for:
   - Template placeholder filling (test that all placeholders are filled)
   - JSON parsing (malformed JSONL recovery)
   - GitHub API fetch (mock response, test error handling)

4. **Documentation:** Add a `CONTRIBUTING.md` guide for:
   - How to update templates safely
   - Placeholder naming conventions
   - Sync protocol with `~/.pi/agent/skills/pam/`

5. **Monorepo detection:** Enhance `scan-readmes.mjs` to auto-detect project boundaries (look for package.json, Cargo.toml, etc., not just README). This makes it work with non-traditional monorepo layouts.

6. **Async execution:** Current scripts are synchronous. For large monorepos (1000+ projects), add async parallelization to speed up scans.
