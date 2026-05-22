#!/usr/bin/env node
/**
 * scan-readmes.mjs
 *
 * Deterministic walker for the PAM skill. Walks a monorepo root, finds every
 * README.md (skipping noise dirs), and emits structured JSON describing each
 * one. The AI agent consumes this output to synthesize the PAM_Master / ASS_MASTER /
 * PAM_Slave / ASS_SLAVE / PASS / ReadMyAss files.
 *
 * Usage:
 *   node scan-readmes.mjs              # default root: current working directory
 *   node scan-readmes.mjs <root>       # custom root
 *   node scan-readmes.mjs --json       # emit JSON (default)
 *   node scan-readmes.mjs --tree       # emit human-readable tree only
 *
 * Output JSON shape:
 *   {
 *     root: "/path/to/your/monorepo",
 *     scannedAt: "2026-05-07T...",
 *     projects: [
 *       {
 *         name: "pi-pager",
 *         path: "/path/to/your/monorepo/my-project",
 *         relPath: "pi-pager",
 *         level: 1,                          // 1 = top-level project
 *         readme: {
 *           path: "...",
 *           bytes: 1234,
 *           lastModified: "2026-04-24T...",
 *           headings: ["# pi-pager", "## Install", ...],
 *           firstParagraph: "Audible + visual + mobile alerts...",
 *           content: "<full README markdown>"
 *         },
 *         hasPiDir: true,
 *         hasMapsDir: false,
 *         significantFiles: [               // detected stack/runtime files
 *           "package.json", "scripts/notify.ps1", ...
 *         ],
 *         languageStack: ["typescript", "powershell"],
 *         nestedReadmes: [                  // READMEs deeper than top-level
 *           { relPath: "scripts/README.md", bytes: 234, lastModified: "..." }
 *         ]
 *       },
 *       ...
 *     ]
 *   }
 */

import fs from "node:fs";
import path from "node:path";

// Default root: override with PAM_ROOT env var, CLI arg, or falls back to cwd
const DEFAULT_ROOT = process.env.PAM_ROOT || process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".venv",
  "venv",
  "_venv",
  "env",
  "_env",
  ".git",
  "dist",
  "build",
  "out",
  "target",
  "__pycache__",
  ".pytest_cache",
  ".next",
  ".turbo",
  ".cache",
  ".vite",
  ".parcel-cache",
  ".gradle",
  "coverage",
  ".nyc_output",
  "tmp",
  ".tmp",
  "logs",
  ".idea",
  ".vscode-test",
  "_archive",
  "_archives",
  "archive",
  "archives",
]);

// Skip directories matching these patterns (case-insensitive substring on name)
const SKIP_PATTERNS = [
  /^_\+.*\+_$/i,    // _+ALL PREVIOUS+_ archive folders
  /^\+\+.*\+\+$/,   // ++ 3rd PARTY PARSERS ++
  /^worktree-/i,    // git worktree folders
  /^old[-_ ]/i,     // old-* / old_* folders
  /[-_]old$/i,      // *-old / *_old folders
  /^backup[-_ ]?/i, // backup folders
];

// Files that hint at the project's runtime/stack
const STACK_HINTS = {
  "package.json": "node",
  "pyproject.toml": "python",
  "requirements.txt": "python",
  "Pipfile": "python",
  "Cargo.toml": "rust",
  "go.mod": "go",
  "Gemfile": "ruby",
  "composer.json": "php",
  "pom.xml": "java",
  "build.gradle": "java",
  "Dockerfile": "docker",
  "docker-compose.yml": "docker",
  "docker-compose.yaml": "docker",
  "tsconfig.json": "typescript",
  "next.config.js": "next",
  "next.config.ts": "next",
  "vite.config.js": "vite",
  "vite.config.ts": "vite",
  "tauri.conf.json": "tauri",
  "manifest.json": "browser-extension",
  "*.csproj": "dotnet",
  "*.sln": "dotnet",
};

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const ROOT = positional[0] || DEFAULT_ROOT;

if (!fs.existsSync(ROOT)) {
  console.error(`Root does not exist: ${ROOT}`);
  process.exit(1);
}

function isSkipDir(name) {
  if (SKIP_DIRS.has(name)) return true;
  if (name.startsWith(".") && name !== ".pi") return true; // skip hidden except .pi
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

/**
 * Walk a directory recursively, returning all README.md paths.
 * Caps recursion depth to avoid pathological repos.
 */
function findReadmes(dir, maxDepth = 6, currentDepth = 0, results = []) {
  if (currentDepth > maxDepth) return results;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isSkipDir(entry.name)) continue;
      findReadmes(path.join(dir, entry.name), maxDepth, currentDepth + 1, results);
    } else if (entry.isFile() && entry.name.toLowerCase() === "readme.md") {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

/**
 * Pull the first ~20 headings + first paragraph from a markdown file.
 * Bounded read so we don't slurp huge READMEs into JSON.
 */
function summarizeReadme(absPath) {
  let content = "";
  try {
    content = fs.readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
  const lines = content.split(/\r?\n/);
  const headings = [];
  let firstParagraph = "";
  let inFirstPara = false;
  let paraLines = [];

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      headings.push(line.trim());
      if (headings.length >= 30) break;
      if (paraLines.length > 0 && !firstParagraph) {
        firstParagraph = paraLines.join(" ").trim();
      }
      paraLines = [];
      inFirstPara = false;
    } else if (line.trim() === "") {
      if (paraLines.length > 0 && !firstParagraph) {
        firstParagraph = paraLines.join(" ").trim();
        paraLines = [];
      }
    } else if (!firstParagraph) {
      paraLines.push(line.trim());
    }
  }
  if (!firstParagraph && paraLines.length) {
    firstParagraph = paraLines.join(" ").trim();
  }

  return {
    path: absPath.replace(/\\/g, "/"),
    bytes: content.length,
    lastModified: fs.statSync(absPath).mtime.toISOString(),
    headings: headings.slice(0, 20),
    firstParagraph: firstParagraph.slice(0, 500),
    content, // full content for Claude to read; consumer can trim
  };
}

/**
 * For a given top-level project directory, detect stack/runtime files.
 */
function detectStack(projectDir) {
  const detected = new Set();
  const significantFiles = [];
  let entries;
  try {
    entries = fs.readdirSync(projectDir, { withFileTypes: true });
  } catch {
    return { stack: [], significantFiles: [] };
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (STACK_HINTS[entry.name]) {
      detected.add(STACK_HINTS[entry.name]);
      significantFiles.push(entry.name);
    } else {
      // Check glob patterns (*.csproj, *.sln)
      for (const [pattern, stack] of Object.entries(STACK_HINTS)) {
        if (pattern.startsWith("*.")) {
          const ext = pattern.slice(1);
          if (entry.name.endsWith(ext)) {
            detected.add(stack);
            significantFiles.push(entry.name);
          }
        }
      }
    }
  }
  return { stack: [...detected], significantFiles };
}

function main() {
  const allReadmes = findReadmes(ROOT);

  // Group by top-level project (direct child of ROOT).
  // Anything deeper is a "nested" README of that project.
  const projectsMap = new Map();

  for (const readmePath of allReadmes) {
    const norm = readmePath.replace(/\\/g, "/");
    const rootNorm = ROOT.replace(/\\/g, "/");
    if (!norm.startsWith(rootNorm)) continue;
    const rel = norm.slice(rootNorm.length).replace(/^\/+/, "");
    const parts = rel.split("/");

    // Skip the monorepo root README itself (if any)
    if (parts.length === 1 && parts[0].toLowerCase() === "readme.md") {
      continue;
    }

    const projectName = parts[0];
    if (!projectsMap.has(projectName)) {
      projectsMap.set(projectName, {
        name: projectName,
        readmes: [],
      });
    }
    projectsMap.get(projectName).readmes.push({
      absPath: readmePath,
      relInProject: parts.slice(1).join("/") || "README.md",
    });
  }

  const projects = [];
  for (const [name, info] of projectsMap.entries()) {
    const projectPath = path.join(ROOT, name).replace(/\\/g, "/");
    const projectStat = fs.existsSync(projectPath) ? fs.statSync(projectPath) : null;
    if (!projectStat || !projectStat.isDirectory()) continue;

    // Top-level README (the one directly inside the project root)
    const topReadme = info.readmes.find((r) => r.relInProject === "README.md");
    const nestedReadmes = info.readmes
      .filter((r) => r.relInProject !== "README.md")
      .map((r) => {
        const stat = fs.statSync(r.absPath);
        return {
          relPath: r.relInProject,
          bytes: stat.size,
          lastModified: stat.mtime.toISOString(),
        };
      });

    const { stack, significantFiles } = detectStack(projectPath);
    const hasPiDir = fs.existsSync(path.join(projectPath, ".pi"));
    const hasMapsDir = fs.existsSync(path.join(projectPath, ".pi", "MAPS"));

    projects.push({
      name,
      path: projectPath,
      relPath: name,
      level: 1,
      readme: topReadme ? summarizeReadme(topReadme.absPath) : null,
      hasPiDir,
      hasMapsDir,
      languageStack: stack,
      significantFiles,
      nestedReadmes,
    });
  }

  // Sort projects alphabetically for stability
  projects.sort((a, b) => a.name.localeCompare(b.name));

  // Also list top-level directories that have NO README anywhere in their tree
  // — these still need PAM coverage so they don't fall through.
  const topLevelDirs = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !isSkipDir(e.name))
    .map((e) => e.name);
  const projectNames = new Set(projects.map((p) => p.name));
  // .pi is PAM's own home at the monorepo level; not undocumented, just structural
  const undocumentedDirs = topLevelDirs
    .filter((n) => !projectNames.has(n) && n !== ".pi")
    .sort();

  // Loose bag-of-files we may also want PAM to know about at root level
  const rootLooseFiles = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();

  const result = {
    root: ROOT.replace(/\\/g, "/"),
    scannedAt: new Date().toISOString(),
    totalProjects: projects.length,
    projectsWithReadme: projects.filter((p) => p.readme).length,
    projectsWithMaps: projects.filter((p) => p.hasMapsDir).length,
    undocumentedDirs,
    rootLooseFiles,
    projects,
  };

  if (flags.has("--tree")) {
    // Human-readable tree
    console.log(`Monorepo root: ${result.root}`);
    console.log(`Scanned at: ${result.scannedAt}`);
    console.log(
      `Projects: ${result.totalProjects} (with README: ${result.projectsWithReadme}, with MAPS: ${result.projectsWithMaps})\n`,
    );
    for (const p of result.projects) {
      const star = p.hasMapsDir ? "⭐" : "  ";
      const stack = p.languageStack.length ? ` [${p.languageStack.join(", ")}]` : "";
      const readmeMark = p.readme ? "📄" : "❌";
      console.log(`${star} ${readmeMark} ${p.name}${stack}`);
      if (p.nestedReadmes.length) {
        for (const n of p.nestedReadmes) {
          console.log(`        └─ ${n.relPath}`);
        }
      }
    }
    if (result.undocumentedDirs.length) {
      console.log(`\nTop-level dirs with NO README (${result.undocumentedDirs.length}):`);
      for (const d of result.undocumentedDirs) {
        console.log(`   ❌ ${d}`);
      }
    }
  } else {
    process.stdout.write(JSON.stringify(result, null, 2));
  }
}

main();
