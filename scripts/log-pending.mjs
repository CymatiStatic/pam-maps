#!/usr/bin/env node
/**
 * log-pending.mjs
 *
 * Append a JSONL line to <Project>/.pi/MAPS/.pam-pending.jsonl, recording
 * a PAM-significant change for the next /pam sync to absorb. Used by every
 * agent following the global PAM Reporting Protocol in
 * ~/.pi/agent/SYSTEM.md.
 *
 * Usage:
 *   node log-pending.mjs --project <name> --type <type> --summary "<text>" \
 *                        [--files "a.ts,b.ts"] [--ripple "<text>"] \
 *                        [--details "<text>"] [--agent "<agent name>"]
 *
 *   # Read a previously-written pending log:
 *   node log-pending.mjs --read --project <name>
 *
 *   # Drain (read + clear) the pending log for a project (PAM uses this):
 *   node log-pending.mjs --drain --project <name>
 *
 *   # List pending counts for every project:
 *   node log-pending.mjs --counts
 *
 * Type values: new-project | rename-project | delete-project |
 *              contract-change | new-dependency | dependency-removed |
 *              role-change | other
 *
 * Exit codes: 0 = success, 1 = bad args, 2 = io error.
 */

import fs from "node:fs";
import path from "node:path";

const CYMATIC_ROOT = "C:/Users/Ben/Dev/CymaticAPPS";
const VALID_TYPES = new Set([
  "new-project",
  "rename-project",
  "delete-project",
  "contract-change",
  "new-dependency",
  "dependency-removed",
  "role-change",
  "other",
]);

function parseArgs(argv) {
  const out = { _flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out._flags.add(key);
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function pendingPath(projectName) {
  return path
    .join(CYMATIC_ROOT, projectName, ".pi", "MAPS", ".pam-pending.jsonl")
    .replace(/\\/g, "/");
}

function ensureDirsForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function appendEntry(args) {
  const { project, type, summary } = args;
  if (!project) throw new Error("--project is required");
  if (!type) throw new Error("--type is required");
  if (!summary) throw new Error("--summary is required");
  if (!VALID_TYPES.has(type)) {
    throw new Error(
      `--type must be one of: ${[...VALID_TYPES].join(", ")} (got: ${type})`,
    );
  }

  const projectDir = path.join(CYMATIC_ROOT, project);
  if (!fs.existsSync(projectDir)) {
    throw new Error(
      `Project does not exist: ${projectDir}\n` +
        `If you're about to create it, append the entry after creation, ` +
        `or pass --project <existing-anchor> with details about the new project.`,
    );
  }

  const entry = {
    ts: new Date().toISOString(),
    agent: args.agent || process.env.PI_AGENT_NAME || "unknown-agent",
    project,
    type,
    summary,
  };
  if (args.files) entry.files = args.files.split(",").map((s) => s.trim()).filter(Boolean);
  if (args.ripple) entry.ripple = args.ripple;
  if (args.details) entry.details = args.details;

  const target = pendingPath(project);
  ensureDirsForFile(target);
  fs.appendFileSync(target, JSON.stringify(entry) + "\n", "utf8");

  return { written: target, entry };
}

function readEntries(project) {
  const target = pendingPath(project);
  if (!fs.existsSync(target)) return [];
  const lines = fs.readFileSync(target, "utf8").split(/\r?\n/).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      entries.push({ _malformed: true, raw: line });
    }
  }
  return entries;
}

function drainEntries(project) {
  const entries = readEntries(project);
  const target = pendingPath(project);
  if (fs.existsSync(target)) {
    // Move the file aside as a backup with timestamp, then clear
    const backup = target.replace(
      ".pam-pending.jsonl",
      `.pam-pending.${new Date().toISOString().replace(/[:.]/g, "-")}.drained.jsonl`,
    );
    fs.renameSync(target, backup);
  }
  return { entries, count: entries.length };
}

function listCounts() {
  if (!fs.existsSync(CYMATIC_ROOT)) return [];
  const dirs = fs
    .readdirSync(CYMATIC_ROOT, { withFileTypes: true })
    .filter((e) => {
      if (!e.isDirectory()) return false;
      // Skip dotfiles (except .pi if it ever holds a project, which it shouldn't)
      if (e.name.startsWith(".")) return false;
      // Skip archive markers like _+ALL PREVIOUS+_, _archive, _venv — single _ prefix
      // BUT keep __ prefix (Ben's meta-convention, e.g., __Orchestration Related__)
      if (e.name.startsWith("_") && !e.name.startsWith("__")) return false;
      return true;
    })
    .map((e) => e.name);
  const counts = [];
  for (const name of dirs) {
    const target = pendingPath(name);
    if (!fs.existsSync(target)) continue;
    const lines = fs.readFileSync(target, "utf8").split(/\r?\n/).filter(Boolean);
    if (lines.length) counts.push({ project: name, count: lines.length, path: target });
  }
  return counts;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    if (args._flags.has("counts")) {
      const counts = listCounts();
      process.stdout.write(JSON.stringify(counts, null, 2));
      return 0;
    }

    if (args._flags.has("read")) {
      if (!args.project) throw new Error("--project required for --read");
      const entries = readEntries(args.project);
      process.stdout.write(JSON.stringify(entries, null, 2));
      return 0;
    }

    if (args._flags.has("drain")) {
      if (!args.project) throw new Error("--project required for --drain");
      const result = drainEntries(args.project);
      process.stdout.write(JSON.stringify(result, null, 2));
      return 0;
    }

    // Default: append a new entry
    const result = appendEntry(args);
    process.stderr.write(
      `PAM pending logged: ${result.entry.project} / ${result.entry.type} / "${result.entry.summary}"\n` +
        `  -> ${result.written}\n`,
    );
    process.stdout.write(JSON.stringify(result.entry));
    return 0;
  } catch (e) {
    process.stderr.write(`log-pending: ${e.message}\n`);
    return e.message.startsWith("--") ? 1 : 2;
  }
}

process.exit(main());
