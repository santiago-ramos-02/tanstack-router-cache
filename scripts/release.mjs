#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const publishWorkflow = "publish.yml";
const githubRepository = "santiago-ramos-02/tanstack-router-cache";
const publishRunLookupAttempts = 12;
const publishRunLookupIntervalMs = 5000;
const npmVersionLookupAttempts = 24;
const npmVersionLookupIntervalMs = 5000;
const sharedBufferBytes = 4;
const requestedVersion = process.argv[2];

if (!requestedVersion) {
  printUsage();
  process.exit(1);
}

releaseVersion(requestedVersion);

function releaseVersion(versionSpec) {
  const release = prepareRelease(versionSpec);
  pushRelease(release);
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

  console.log(`Prepared ${tagName}. Publishing release.`);

  return {
    packageName: packageJson.name,
    tagName,
    version: nextVersion,
  };
}

function pushRelease(release) {
  ensureMainBranch();
  ensureCleanTree();

  const { packageName, tagName, version } = release;

  if (!tagExists(tagName)) {
    fail(`${tagName} does not exist locally.`);
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

  console.log(
    `${tagName} pushed. Creating the GitHub Release and verifying npm.`
  );

  createGitHubRelease(tagName);
  watchPublishWorkflow(tagName);
  verifyNpmVersion(packageName, version);
}

function createGitHubRelease(tagName) {
  if (ghReleaseExists(tagName)) {
    run("gh", [
      "release",
      "edit",
      tagName,
      "--repo",
      githubRepository,
      "--latest",
    ]);
    return;
  }

  run("gh", [
    "release",
    "create",
    tagName,
    "--repo",
    githubRepository,
    "--verify-tag",
    "--generate-notes",
    "--latest",
  ]);
}

function watchPublishWorkflow(tagName) {
  const runId = findPublishRunId(tagName);

  run("gh", [
    "run",
    "watch",
    runId,
    "--repo",
    githubRepository,
    "--exit-status",
  ]);
}

function verifyNpmVersion(packageName, version) {
  for (let attempt = 0; attempt < npmVersionLookupAttempts; attempt += 1) {
    const publishedVersion = readIfSuccessful("npm", [
      "view",
      `${packageName}@${version}`,
      "version",
    ]);

    if (publishedVersion === version) {
      console.log(`${packageName}@${version} is available on npm.`);
      return;
    }

    sleep(npmVersionLookupIntervalMs);
  }

  fail(`Could not verify ${packageName}@${version} on npm.`);
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

function ghReleaseExists(tagName) {
  try {
    execFileSync(
      "gh",
      ["release", "view", tagName, "--repo", githubRepository],
      {
        stdio: "ignore",
      }
    );
    return true;
  } catch {
    return false;
  }
}

function findPublishRunId(tagName) {
  for (let attempt = 0; attempt < publishRunLookupAttempts; attempt += 1) {
    const runs = JSON.parse(
      read("gh", [
        "run",
        "list",
        "--repo",
        githubRepository,
        "--workflow",
        publishWorkflow,
        "--limit",
        "10",
        "--json",
        "databaseId,headBranch,status",
      ])
    );
    const publishRun = runs.find(
      (workflowRun) => workflowRun.headBranch === tagName
    );

    if (publishRun) {
      return String(publishRun.databaseId);
    }

    sleep(publishRunLookupIntervalMs);
  }

  fail(`Could not find the ${publishWorkflow} run for ${tagName}.`);
}

function read(file, args) {
  return execFileSync(file, args, { encoding: "utf8" }).trim();
}

function readIfSuccessful(file, args) {
  try {
    return read(file, args);
  } catch {
    return "";
  }
}

function run(file, args) {
  execFileSync(file, args, { stdio: "inherit" });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sleep(ms) {
  Atomics.wait(
    new Int32Array(new SharedArrayBuffer(sharedBufferBytes)),
    0,
    0,
    ms
  );
}

function printUsage() {
  console.log(`Usage:
  bun run release patch
  bun run release minor
  bun run release major
  bun run release 0.2.0`);
}
