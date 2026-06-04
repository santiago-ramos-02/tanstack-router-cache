#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const command = process.argv[2];

if (command === "prepare") {
  prepareRelease(process.argv[3]);
} else if (command === "push") {
  pushRelease();
} else {
  printUsage();
  process.exit(1);
}

function prepareRelease(versionSpec) {
  if (!versionSpec) {
    printUsage();
    process.exit(1);
  }

  ensureMainBranch();
  ensureCleanTree();

  const packageJson = readPackageJson();
  const nextVersion = resolveNextVersion(packageJson.version, versionSpec);
  const tagName = `v${nextVersion}`;

  if (tagExists(tagName)) {
    fail(`${tagName} already exists locally.`);
  }

  packageJson.version = nextVersion;
  writePackageJson(packageJson);

  run("bun", ["run", "check"]);
  run("git", ["add", "package.json"]);
  run("git", ["commit", "-m", `Release ${tagName}`]);
  run("git", ["tag", tagName]);

  console.log(`Prepared ${tagName}. Run "bun run release:push" to publish.`);
}

function pushRelease() {
  ensureMainBranch();
  ensureCleanTree();

  const packageJson = readPackageJson();
  const tagName = `v${packageJson.version}`;

  if (!tagExists(tagName)) {
    fail(
      `${tagName} does not exist locally. Run "bun run release:prepare patch" first.`
    );
  }

  const headCommit = read("git", ["rev-parse", "HEAD"]);
  const tagCommit = read("git", ["rev-list", "-n", "1", tagName]);

  if (headCommit !== tagCommit) {
    fail(
      `${tagName} does not point at HEAD. Check out the release commit before pushing.`
    );
  }

  run("git", ["push", "origin", "main"]);
  run("git", ["push", "origin", tagName]);

  console.log(`${tagName} pushed. GitHub Actions will publish it to npm.`);
}

function readPackageJson() {
  return JSON.parse(readFileSync("package.json", "utf8"));
}

function writePackageJson(packageJson) {
  writeFileSync("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
}

function resolveNextVersion(currentVersion, versionSpec) {
  const current = parseVersion(currentVersion);

  if (["major", "minor", "patch"].includes(versionSpec)) {
    const next = [...current];

    if (versionSpec === "major") {
      next[0] += 1;
      next[1] = 0;
      next[2] = 0;
    }

    if (versionSpec === "minor") {
      next[1] += 1;
      next[2] = 0;
    }

    if (versionSpec === "patch") {
      next[2] += 1;
    }

    return formatVersion(next);
  }

  const next = parseVersion(versionSpec);

  if (compareVersions(next, current) <= 0) {
    fail(
      `${versionSpec} must be greater than the current version ${currentVersion}.`
    );
  }

  return versionSpec;
}

function parseVersion(version) {
  const match = stableVersionPattern.exec(version);

  if (!match) {
    fail(`Expected a stable semver version like 0.2.0, received "${version}".`);
  }

  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (const index of [0, 1, 2]) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
}

function formatVersion(version) {
  return version.join(".");
}

function ensureMainBranch() {
  const branch = read("git", ["branch", "--show-current"]);

  if (branch !== "main") {
    fail(
      `Releases must be prepared from main. Current branch: ${branch || "(detached)"}.`
    );
  }
}

function ensureCleanTree() {
  const status = read("git", ["status", "--porcelain"]);

  if (status) {
    fail(
      "Working tree is not clean. Commit or stash changes before releasing."
    );
  }
}

function tagExists(tagName) {
  try {
    execFileSync(
      "git",
      ["rev-parse", "--verify", "--quiet", `refs/tags/${tagName}`],
      {
        stdio: "ignore",
      }
    );
    return true;
  } catch {
    return false;
  }
}

function read(file, args) {
  return execFileSync(file, args, { encoding: "utf8" }).trim();
}

function run(file, args) {
  execFileSync(file, args, { stdio: "inherit" });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printUsage() {
  console.log(`Usage:
  bun run release:prepare patch
  bun run release:prepare minor
  bun run release:prepare major
  bun run release:prepare 0.2.0
  bun run release:push`);
}
