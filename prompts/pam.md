---
description: "PAM — Project Architectural Maps. Maintain the monorepo map hierarchy (Master/Slave) and evaluate third-party repos."
---

# /pam

Load and follow the PAM skill at `skills/pam/SKILL.md`.

Read PAM's canonical identity first: `agents/PAM.md`.

## Arguments

The text that followed `/pam` (if any): **{{ARGS}}**

Parse it as a subcommand:

- `status` (or empty) → run the **status** workflow (read-only).
- `sync` → run the **full sync** workflow.
- `sync --master-only` → refresh just the 3 monorepo-level files.
- `sync --new-only` → fill in only projects without MAPS folders.
- `sync <project>` → refresh just that one project's 4 files.
- `evaluate <github-url>` → run the **evaluate** workflow against the URL.

If `{{ARGS}}` doesn't match any of the above, print the subcommand list and ask the user.
