---
name: pam
description: "Project Architectural Maps. Maintains a multi-layer map of a monorepo or multi-repo system (Master + Slave maps, ASS/PASS significance files, ReadMyAss human guides) and evaluates whether third-party repos add value, are redundant, or could conflict. Trigger via /pam. Auto-trigger phrases: 'ask PAM', 'PAM, ...', 'update the map', 'is this repo useful'."
---

# PAM — Project Architectural Maps Skill

> **Read `agents/PAM.md` first.** That is PAM's canonical identity,
> vocabulary (ASS / PASS / ReadMyAss / Master / Slave), file hierarchy, and
> rules. This SKILL.md is the *workflow* — what to do when invoked. PAM.md
> is the *who PAM is*.

---

## Subcommands

| Command | What it does |
|---------|--------------|
| `/pam status` | Read-only. Show last sync time, which projects have/lack maps, which are stale. |
| `/pam sync` | Full sync — refresh monorepo-level files + every project's slave files (with cache, only re-synthesize what changed). |
| `/pam sync --master-only` | Refresh just the 3 monorepo-level files. |
| `/pam sync --new-only` | Fill in any project that doesn't yet have a MAPS folder. |
| `/pam sync <project>` | Refresh just one project's 4 files (e.g. `/pam sync pi-pager`). **Auto-chains to `/pam sync --master-only` on success — see Rule 8 in `~/.pi/agent/agents/PAM.md`.** |
| `/pam evaluate <github-url>` | Render a verdict on whether a third-party repo adds value to your system. |

---

## Workflow: `/pam status`

1. Run `pam-scan` (or `node scripts/scan-readmes.mjs`) — JSON output.
2. Read the cache at `<monorepo>/.pi/MAPS/.pam-cache.json` if it exists.
3. Read the pending-log counts:
   ```bash
   pam-log --counts
   ```
4. Render a status table:
   - Last sync time (from cache, or "never")
   - For each project: has README? has MAPS? when last synced? README modified since last sync? **pending changes count**?
   - Surface any non-zero pending counts prominently — these are reasons to run `/pam sync`.
   - List of `undocumentedDirs` from the scanner output (top-level dirs with no README anywhere) — flag these as "needs documentation".
5. Do NOT write any files. Pure read-only.

---

## Workflow: `/pam sync` (full or filtered)

### Step 1 — Scan
Run the scanner. Capture the JSON.

```bash
pam-scan > /tmp/pam-scan.json
```

(Use ctx-mode `ctx_execute_file` if the JSON is large.)

### Step 2 — Load cache & determine what to regenerate

Cache lives at `<monorepo>/.pi/MAPS/.pam-cache.json` with shape:
```json
{
  "lastSyncedAt": "ISO8601",
  "projects": {
    "<name>": {
      "lastSyncedAt": "ISO8601",
      "readmeMtimeAtSync": "ISO8601",
      "readmeBytesAtSync": 1234
    }
  }
}
```

A project needs re-synthesis if:
- It has no entry in the cache, OR
- Its current README mtime > `readmeMtimeAtSync`, OR
- Its current README byte count != `readmeBytesAtSync`, OR
- Its `.pi/MAPS/` directory doesn't exist or is missing any of the 4 expected files.

### Step 3 — Synthesize monorepo-level files

Generate (or update) all three:

#### `<monorepo>/.pi/MAPS/PAM_Master.md`
- A visual file tree of the monorepo, rendered as a fenced ```` ```text ```` block.
- ⭐ marks projects that are ASS-significant (affect the global system).
- 🟡 marks projects that are PASS-significant only (internally important but no global ripple).
- ⚪ marks projects with neither (e.g. archived, scratch, or no README).
- Top of file: legend, last-scanned timestamp, project counts.
- Use the template at `templates/PAM_Master.template.md`.

#### `<monorepo>/.pi/MAPS/ReadMyAss.md`
- Human-readable. Open with the *You Are Here* breadcrumb showing this is the **Master** position in the hierarchy.
- Include a **Mermaid diagram** of system relationships (`graph LR` style — projects as nodes, edges = "depends on", "produces input for", "consumes output of").
- Plain-English explanation of how systems tie together.
- Bottom: navigation table linking to each project's `<Project>/.pi/MAPS/ReadMyAss.md`.
- Template: `templates/ReadMyAss_Master.template.md`.

#### `<monorepo>/.pi/MAPS/ASS_MASTER.md`
- **The most important file.** This is what PAM consults when evaluating third-party repos and when reasoning about ripple effects.
- For each project: 1-paragraph "what it contributes globally", explicit "depends on" / "depended on by" lists, "what breaks if this disappears" answer.
- Group by functional role (e.g. Core Services · Frontend · Tools · Archived).
- Bottom: include the Master Map as a quick reference.
- Template: `templates/ASS_MASTER.template.md`.

### Step 3.5 — Drain pending logs

For each project being re-synthesized (or for ALL projects if doing a full sync), drain the pending log:

```bash
pam-log --drain --project <name>
```

This returns the JSONL entries and moves the file aside as a timestamped
`.drained.jsonl` backup. Use those entries to inform synthesis — each
entry tells you what changed since the last sync. Pending entries are
additive evidence on top of the README scan.

If a project has pending entries but its README hasn't changed, you
still need to re-synthesize because the entries describe contract /
dependency changes the README may not yet reflect.

**Do not delete `.drained.jsonl` backups** — they're the audit trail.

### Step 4 — Synthesize per-project files (Slave layer)

For each project that needs (re)generation, write to `<Project>/.pi/MAPS/`:

| File | Source of truth |
|------|-----------------|
| `PAM_Slave.md` | Walk the project's directory; ⭐ files/folders that the program actually uses to run; reference nested READMEs. |
| `ReadMyAss.md` | Human-readable; *You Are Here* pinned to this project; Mermaid showing this project's place in the global graph. |
| `ASS_SLAVE.md` | ONLY the systems in this repo that affect the GLOBAL system structure — hand-off points, shared contracts, ports, daemons, env vars others depend on. |
| `PASS.md` | Project-internal architectural significance — what matters inside this project regardless of global impact (hot paths, fragile glue, critical configs). |

Templates: `templates/PAM_Slave.template.md`, `templates/ReadMyAss_Slave.template.md`, `templates/ASS_SLAVE.template.md`, `templates/PASS.template.md`.

**Rule of thumb for in-use vs not-in-use:**
- ⭐ ASS-marked: `package.json`, `pyproject.toml`, `Dockerfile`, the actual entry point, scripts referenced from package.json/scripts, source folders the entry point imports.
- 🟡 PASS-marked: tests, build configs, dev tooling, internal docs.
- ⚪ Unmarked: `.gitignore`, IDE configs, generated files, archive folders, scratch.

### Step 5 — Update cache

After all writes succeed, rewrite `.pam-cache.json` with current timestamps.

### Step 6 — Report

Report:
- How many projects were synthesized vs cached
- Which files were created/updated
- Any projects that lacked a README (need attention)
- Path to `ASS_MASTER.md` (the file he should read if he wants the global picture)

### Step 7 — Auto-chain to Master sync (slave-only operations only)

**This step applies to `/pam sync <project>` and `/pam sync --new-only`** —
any operation that wrote Slave files but did not refresh the Master layer.
**It does NOT apply to a full `/pam sync` (which already includes Master)
or to `/pam sync --master-only` itself.**

After Step 6 reports the slave-only result, immediately and without
asking, run the Master sync workflow (Step 3 above — synthesize
`PAM_Master.md`, `ReadMyAss.md`, `ASS_MASTER.md`) and report the result
in the same turn. The user does not need to opt in; this is the
standing rule.

Rationale: `/pam evaluate <github-url>` reads `ASS_MASTER.md` to spot
overlap. The master `ReadMyAss.md` Mermaid diagram is the only
cross-project graph view. If either is stale relative to a freshly-
synthesized project, every downstream PAM operation gives degraded
answers without warning.

Failure handling: if Master sync fails (cache write error, scanner
crash, template missing), surface the failure with the same prominence
as a primary failure. Never silently swallow.

---

## Workflow: `/pam evaluate <github-url>`

### Step 1 — Fetch the repo's README & metadata

```bash
pam-fetch <url>
```

Use ctx-mode for the JSON if it's large.

### Step 2 — Read ASS_MASTER.md

If `<monorepo>/.pi/MAPS/ASS_MASTER.md` doesn't exist yet, run `/pam sync --master-only` first. PAM cannot render a verdict without knowing the existing system landscape.

### Step 3 — Render a verdict

Pick exactly one of the 5 verdicts (use the most accurate, in priority order):

| Verdict | When to choose |
|---------|----------------|
| ✅ **ADDS VALUE** | Clear gap-fill. You can name (a) which existing project(s) it would slot into, (b) one or more concrete integration points, (c) a recommended next step. |
| 🟡 **MAYBE** | Partial overlap, OR the value depends on a direction one of the existing projects hasn't committed to. Name the conditional explicitly. |
| 🔴 **REDUNDANT** | The system already has `<project>` doing this. Name the existing project and the overlap. If the new repo is *better* than the existing one, say so and recommend evaluating a swap. |
| ⚠️ **COULD CONFLICT** | Port collision (check .env / docker-compose), global hooks, overlapping daemons, license incompatibility, or anything that would step on something already running. Name the specific conflict. |
| ⛔ **NOT USEFUL** | Doesn't fit the current stack at all. Name why (wrong domain, wrong runtime, abandoned > 2 years, fork of fork, etc.). |

### Step 4 — Escalate to clone if needed

If the README is thin, ambiguous, or the metadata raises questions you can't answer (e.g. "the README is 10 lines but it claims to be a full WebSocket server"), ask the user:

> "The README isn't enough to render a verdict with confidence (currently 60%). Should I clone for deeper inspection?"

If yes, clone into a separate directory (not the monorepo root):
```bash
git clone <url> /tmp/pam-eval/<repo>
```

After inspection, ask:
> "Verdict rendered. Keep the clone for further inspection, or delete it?"

### Step 5 — Output the verdict report

```markdown
## PAM Evaluation: <owner>/<repo>

**Verdict**: <emoji+label>
**Confidence**: <0–100>%

### Rationale
<2–4 sentences explaining the verdict>

### Touched systems
- `<existing-project>` — <how this repo would interact with it>
- ...

### Concrete integration points (if ADDS VALUE / MAYBE)
1. ...

### Conflicts (if COULD CONFLICT)
- Port: ...
- Hook: ...
- License: ...

### Recommended action
<Try it / Skip it / Watch it / Replace `<project>` with it / Discuss>

### Source check
- README size: <N bytes>
- Last push: <date>
- Stars: <N>
- License: <SPDX>
- Cloned for inspection: <yes/no, path if yes>
```

---

## Triggers (auto-invoke)

PAM should engage even without an explicit `/pam` if the user says:

- "Ask PAM..."
- "PAM, ..." (treat as direct address)
- "Update the map" / "Refresh the maps"
- "Is this repo useful?" + a GitHub URL → run `/pam evaluate <url>`
- "Should I add this?" + a GitHub URL → run `/pam evaluate <url>`
- "Where does X fit?" → consult `ASS_MASTER.md` and answer

---

## Output discipline

- For sync runs: report counts (X projects scanned, Y synthesized, Z cached) + a table of changed files.
- For evaluate runs: print the verdict report above as the final message.

---

## Failure modes & recovery

- **Scanner returns 0 projects**: root path wrong, or filesystem issue. Stop and ask.
- **GitHub fetch returns 404**: repo doesn't exist or is private. Ask if the user wants to provide a local clone path instead.
- **GitHub rate limit hit**: set `GITHUB_TOKEN` env var, then retry.
- **A project has no README**: Slave files are still generated, but flagged with a banner: "⚠️ This project has no README. Significance is inferred from directory structure only — please add a README and re-sync."
- **A MAPS file has been hand-edited since last sync**: detect via a `<!-- pam:hand-edited -->` marker users can add, OR via mtime > cache. If detected, ask before overwriting.

---

## Related

- Identity & vocabulary: `agents/PAM.md`
- Slash command entry: `prompts/pam.md`
- Templates: `templates/`
- Scripts: `scripts/`
