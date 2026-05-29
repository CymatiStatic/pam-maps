# 🗺️ PAM Slave Map — pam-maps

> Visual map of `pam-maps`'s internal structure.
> Files and folders that the program actually uses to run are starred.
> For the human-readable narrative see [`ReadMyAss.md`](./ReadMyAss.md).
> For this project's architectural significance to the global system see [`ASS_SLAVE.md`](./ASS_SLAVE.md).
> For internal-only architectural significance see [`PASS.md`](./PASS.md).

**Last synced:** `2026-05-29`
**Stack:** Node.js, TypeScript, Pi skill/extension package
**README size:** 2,841 bytes

## Legend

- ⭐ **ASS** — In-use at runtime; affects how the program runs
- 🟡 **PASS-only** — Internally important (tests, configs, dev tooling)
- ⚪ Neither — archived, scratch, generated, or not directly used

## Map

```text
pam-maps/
├── ⭐ package.json              (main entry, bin shims, keywords)
├── ⭐ agents/
│   └── ⭐ PAM.md               (PAM agent identity + vocabulary)
├── ⭐ skills/
│   └── ⭐ pam/
│       ├── ⭐ SKILL.md         (/pam workflow for AI agents)
│       ├── ⭐ scripts/
│       │   ├── ⭐ scan-readmes.mjs      (walk monorepo, emit JSON)
│       │   ├── ⭐ fetch-repo-readme.mjs (fetch GitHub readme without clone)
│       │   └── ⭐ log-pending.mjs       (append/read pending log)
│       ├── ⭐ templates/
│       │   ├── ⭐ PAM_Slave.template.md
│       │   ├── ⭐ PAM_Master.template.md
│       │   ├── ⭐ ASS_SLAVE.template.md
│       │   ├── ⭐ ASS_MASTER.template.md
│       │   ├── ⭐ PASS.template.md
│       │   ├── ⭐ ReadMyAss_Slave.template.md
│       │   ├── ⭐ ReadMyAss_Master.template.md
│       │   └── ⭐ pre-commit-pam-check.sh
│       └── ⭐ prompts/
│           └── ⭐ pam.md       (slash command entry)
├── ⭐ scripts/
│   └── ⭐ (CLI shims for npm global)
├── 🟡 README.md
├── 🟡 LICENSE
├── 🟡 .gitignore
├── ⚪ node_modules/
└── ⚪ .git/
```

## Nested READMEs in this project

- `README.md` — Full project overview, installation, usage (agent or CLI)
