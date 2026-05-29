# 🏛️ ASS_SLAVE — pam-maps

> **Architectural System Significance — Global perspective.**
>
> This file lists ONLY the things in `pam-maps` that affect the
> global CymaticAPPS system. Internal architecture, even if important
> within the project, does not belong here — that lives in
> [`PASS.md`](./PASS.md).

**Last synced:** `2026-05-29`
**Project role globally:** ⚙️ Meta / Scaffolding (load-bearing cartography system)
**Ripple risk if this project changes/disappears:** High — Governs all monorepo maps; breaking changes break map generation

---

## What this project contributes globally

**The system that generates and maintains PAM files for the entire CymaticAPPS monorepo.**

Every map file at `CymaticAPPS/.pi/MAPS/` (master) and `<Project>/.pi/MAPS/` (slave) is generated using pam-maps templates and scripts. If pam-maps changes significantly, map regeneration may be needed.

pam-maps also:
- **Defines the PAM vocabulary** — ASS, PASS, ReadMyAss, Master, Slave — which is how CymaticAPPS documents significance
- **Provides the `/pam` workflow** — the command for scanning, syncing, evaluating repos
- **Publishes to npm** — teams outside CymaticAPPS can install and use PAM for their own monorepos

## Hand-off contracts (the parts other systems are coupled to)

| Contract | Type | Detail | Coupled systems |
|----------|------|--------|-----------------|
| Template schemas | file-path | Master/Slave templates must match the output format — breaking template changes require re-sync | `/pam sync` regenerates maps using these templates |
| CLI scripts (scan-readmes, fetch-repo-readme, log-pending) | cli-flag | Stability of script flags (`--project`, `--type`, `--summary`, `--ripple`) — breaking changes break downstream tools | Any external team using pam-maps CLI |
| PAM vocabulary (ASS, PASS, etc.) | naming-convention | The vocabulary is fixed API — renaming or redefining terms breaks all maps and documentation | All CymaticAPPS projects, all external PAM users |
| npm publication | npm-package | pam-maps version bumps on npm must be semver-compliant; breaking changes are major versions | Teams installing `npm install -g pam-maps` globally |

(Contract types: `port`, `env-var`, `file-path`, `mcp-server`, `hook`, `cli-flag`, `wire-format`, `daemon`, `database`, `api-shape`.)

## Depends on

- **Node.js** — runtime
- **Pi runtime** (optional) — for `/pam` skill support
- **npm registry** — for distribution

## Depended on by

- **All CymaticAPPS projects** — maps are generated using pam-maps templates
- **External teams** — anyone using `npm install -g pam-maps` or the Pi skill
- **The live `~/.pi/agent/skills/pam/`** — mirror of this repo; must stay in sync

## What breaks if this disappears

1. **Map regeneration stops** — `/pam sync` cannot run; map files cannot be updated
2. **Third-party repo evaluation stops** — `/pam evaluate <url>` cannot run
3. **New projects cannot be onboarded** — no way to generate skeleton maps for new CymaticAPPS repos
4. **External teams lose the PAM tool** — `npm install -g pam-maps` ceases to work

Severity: **High.** This is not a peripheral feature — it is the central cartography system.

## Notes for PAM

**Sync relationship:** The live `~/.pi/agent/skills/pam/` is a **mirror** of `CymaticAPPS/pam-maps/`. The mirror is kept in sync via a semi-manual process (likely `git subtree` or `npm install` + symlink). Breaking changes to pam-maps require coordinated sync to the live copy.

**Publishing protocol:** When pam-maps is updated:
1. Bump version in `package.json` + `CHANGELOG.md`
2. Sync changes to `~/.pi/agent/skills/pam/` (mirror)
3. Run tests (if they exist)
4. `npm publish` to npm registry
5. Announce in CymaticAPPS HANDOFF + project changelogs

**No code imports from other projects.** pam-maps is standalone — no other CymaticAPPS project imports from it.

**External reusability.** The PAM vocabulary and tooling are explicitly designed for external use. Teams building their own monorepos should be able to use pam-maps without understanding CymaticAPPS internals.
