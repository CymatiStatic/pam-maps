#!/usr/bin/env node
/**
 * fetch-repo-readme.mjs
 *
 * Fetches a third-party GitHub repo's README + metadata via the public GitHub
 * API. README-first, no clone — that's the cheap default. Used by /pam evaluate
 * to make a verdict without polluting disk.
 *
 * Usage:
 *   node fetch-repo-readme.mjs <github-url-or-owner/repo>
 *
 * Examples:
 *   node fetch-repo-readme.mjs https://github.com/anthropics/claude-code
 *   node fetch-repo-readme.mjs anthropics/claude-code
 *
 * Output: JSON to stdout with shape:
 *   {
 *     owner, repo, url,
 *     metadata: {
 *       description, language, stars, forks, openIssues, license,
 *       defaultBranch, archived, fork, pushedAt, updatedAt, createdAt,
 *       topics, homepage
 *     },
 *     readme: {
 *       path, encoding, sizeBytes, content // decoded from base64
 *     } | null,
 *     error: string | null
 *   }
 *
 * Auth: uses GITHUB_TOKEN env var if present (raises rate limit from
 * 60/hr to 5000/hr). Anonymous calls work fine for one-off use.
 */

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: fetch-repo-readme.mjs <github-url-or-owner/repo>");
  process.exit(1);
}

function parseRepo(input) {
  // Accept: https://github.com/owner/repo[.git][/...] | owner/repo | git@github.com:owner/repo.git
  let s = input.trim();
  s = s.replace(/^git@github\.com:/, "");
  s = s.replace(/^https?:\/\/github\.com\//, "");
  s = s.replace(/\.git$/, "");
  s = s.replace(/\/$/, "");
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Could not parse owner/repo from: ${input}`);
  }
  return { owner: parts[0], repo: parts[1] };
}

const headers = {
  "User-Agent": "PAM-evaluator (Pi skill, github.com/CymatiStatic)",
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function ghFetch(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  const { owner, repo } = parseRepo(args[0]);
  const out = {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
    metadata: null,
    readme: null,
    error: null,
  };

  try {
    const meta = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
    out.metadata = {
      description: meta.description ?? null,
      language: meta.language ?? null,
      stars: meta.stargazers_count ?? 0,
      forks: meta.forks_count ?? 0,
      openIssues: meta.open_issues_count ?? 0,
      license: meta.license?.spdx_id ?? meta.license?.name ?? null,
      defaultBranch: meta.default_branch ?? null,
      archived: !!meta.archived,
      fork: !!meta.fork,
      pushedAt: meta.pushed_at ?? null,
      updatedAt: meta.updated_at ?? null,
      createdAt: meta.created_at ?? null,
      topics: meta.topics ?? [],
      homepage: meta.homepage ?? null,
      sizeKb: meta.size ?? 0,
    };
  } catch (e) {
    out.error = `metadata: ${e.message}`;
    process.stdout.write(JSON.stringify(out, null, 2));
    process.exit(0);
  }

  try {
    const readme = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/readme`);
    let content = "";
    if (readme.encoding === "base64" && readme.content) {
      content = Buffer.from(readme.content, "base64").toString("utf8");
    } else if (readme.content) {
      content = readme.content;
    }
    out.readme = {
      path: readme.path ?? "README.md",
      encoding: readme.encoding ?? null,
      sizeBytes: readme.size ?? content.length,
      content,
    };
  } catch (e) {
    // README missing isn't fatal — still useful to render verdict from metadata
    out.readme = null;
    out.error = (out.error ? out.error + "; " : "") + `readme: ${e.message}`;
  }

  process.stdout.write(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  process.stderr.write(`Fatal: ${e.message}\n`);
  process.exit(2);
});
