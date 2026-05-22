#!/usr/bin/env bash
# pre-commit-pam-check.sh
#
# Opt-in git pre-commit hook for any CymaticAPPS project. Detects when a
# staged change is likely PAM-significant (touches contracts, configs,
# entry points, or files mentioned in this project's ASS_SLAVE.md) and
# prompts the user to log a pending entry before the commit lands.
#
# Install (per-project, opt-in):
#   cp ~/.pi/agent/skills/pam/templates/pre-commit-pam-check.sh \
#     <Project>/.git/hooks/pre-commit
#   chmod +x <Project>/.git/hooks/pre-commit
#
# Or chain it into an existing pre-commit hook by sourcing this file.
#
# Bypass once: `git commit --no-verify`.
# Disable: delete the hook file. (PAM still works — this is a safety net.)
#
# This script is intentionally conservative:
#  - It NEVER writes a pending entry on its own.
#  - It only prompts the user (interactive only); in non-tty contexts it
#    prints a warning and lets the commit proceed.
#  - It exits 0 (allow commit) on any uncertainty or error.

set -u

# ---- bail-outs ---------------------------------------------------------------

# Only run inside a git repo
git_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

# Only run inside CymaticAPPS
case "$git_root" in
  *CymaticAPPS*) ;;
  *) exit 0 ;;
esac

project_name="$(basename "$git_root")"
maps_dir="$git_root/.pi/MAPS"

# Skip if no MAPS folder yet — PAM hasn't touched this project, no contracts
# to violate
[ -d "$maps_dir" ] || exit 0

# Non-interactive (CI, scripted commits, agent commits with --no-verify)
if [ ! -t 0 ] && [ ! -t 2 ]; then
  exit 0
fi

# ---- detect significance -----------------------------------------------------

staged="$(git diff --cached --name-only 2>/dev/null)" || exit 0
[ -z "$staged" ] && exit 0

# Heuristics — any of these = "likely PAM-significant"
significant=()

while IFS= read -r f; do
  case "$f" in
    # Top-level entry points / configs
    package.json|pyproject.toml|Cargo.toml|go.mod|Gemfile|composer.json) \
      significant+=("$f (root manifest)") ;;
    Dockerfile|docker-compose.yml|docker-compose.yaml) \
      significant+=("$f (container/service surface)") ;;
    .env|.env.example|.env.production|.env.local) \
      significant+=("$f (env-var surface)") ;;
    README.md|README.MD) \
      significant+=("$f (project role doc)") ;;
    # Source-of-truth scripts that other systems likely call
    scripts/notify.*|scripts/install.*|scripts/uninstall.*|install.*|uninstall.*) \
      significant+=("$f (entry point script)") ;;
    # Pi/agent surface
    CLAUDE.md|AGENTS.md|*.cursorrules|.cursorrules) \
      significant+=("$f (agent contract)") ;;
    # Anything in MAPS itself (PAM modifying its own outputs)
    .pi/MAPS/*.md) \
      significant+=("$f (PAM map being hand-edited)") ;;
  esac

  # Heuristic: file appears verbatim in ASS_SLAVE.md → it's a coupling point
  if [ -f "$maps_dir/ASS_SLAVE.md" ]; then
    if grep -F -q -- "$f" "$maps_dir/ASS_SLAVE.md" 2>/dev/null; then
      significant+=("$f (referenced in ASS_SLAVE.md)")
    fi
  fi
done <<< "$staged"

# Dedupe
if [ "${#significant[@]}" -gt 0 ]; then
  IFS=$'\n' significant=($(printf "%s\n" "${significant[@]}" | sort -u))
fi

[ "${#significant[@]}" -eq 0 ] && exit 0

# ---- prompt the user ---------------------------------------------------------

echo ""
echo "🗺️  PAM pre-commit check: this commit looks PAM-significant."
echo "    Project: $project_name"
echo "    Triggers:"
for s in "${significant[@]}"; do
  echo "      - $s"
done
echo ""
echo "    Per ~/.pi/agent/SYSTEM.md § PAM Reporting Protocol, you should"
echo "    log a pending entry so PAM can fold this into the maps on the"
echo "    next /pam sync."
echo ""
echo "    Suggested:"
echo "      node C:/Users/Ben/.pi/agent/skills/PAM/scripts/log-pending.mjs \\"
echo "        --project $project_name \\"
echo "        --type contract-change \\"
echo "        --summary \"<one-line summary of this commit>\""
echo ""

# Read with /dev/tty so we work even if stdin is wonky
exec </dev/tty 2>/dev/null || exit 0
read -r -p "    Have you logged this to PAM? [y/N/skip] " ans

case "${ans:-}" in
  [yY]|[yY][eE][sS])
    exit 0 ;;
  [sS]|[sS][kK][iI][pP])
    echo "    OK — skipping PAM check for this commit."
    exit 0 ;;
  *)
    echo ""
    echo "    Commit aborted. Either:"
    echo "      1. Log the pending entry (command above), then re-commit"
    echo "      2. Bypass once: git commit --no-verify"
    echo ""
    exit 1 ;;
esac
