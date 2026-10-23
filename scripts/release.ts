#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const publishWorkflow = "publish.yml";
const githubRepository = "santiago-ramos-02/tanstack-router-cache";
const publishRunLookupAttempts = 12;
const publishRunLookupIntervalMs = 5000;
const npmVersionLookupAttempts = 24;
const npmVersionLookupIntervalMs = 5000;
const sharedBufferBytes = 4;
const requestedVersion: string | undefined = process.argv[2];

type Version = [major: number, minor: number, patch: number];
type PackageJson = Record<string, unknown> & { name: string; version: string };

type Release = {
  packageName: string;
  tagName: string;
  version: string;
};

type WorkflowRun = {
  databaseId: number;
  headBranch: string;
};

if (!requestedVersion) {
  printUsage();
  process.exit(1);
}

releaseVersion(requestedVersion);

function releaseVersion(versionSpec: string): void {
  const release = prepareRelease(versionSpec);
  pushRelease(release);
}

function prepareRelease(versionSpec: string): Release {
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

function pushRelease(release: Release): void {
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

function createGitHubRelease(tagName: string): void {
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

function watchPublishWorkflow(tagName: string): void {
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

function verifyNpmVersion(packageName: string, version: string): void {
  for (let attempt = 0; attempt < npmVersionLookupAttempts; attempt += 1) {
    const publishedVersion = readIfSuccessful("bun", [
      "pm",
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

function isPackageJson(value: unknown): value is PackageJson {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "version" in value &&
    typeof value.version === "string"
  );
}

function isWorkflowRun(value: unknown): value is WorkflowRun {
  return (
    typeof value === "object" &&
    value !== null &&
    "databaseId" in value &&
    typeof value.databaseId === "number" &&
    "headBranch" in value &&
    typeof value.headBranch === "string"
  );
}

function readPackageJson(): PackageJson {
  const packageJson: unknown = JSON.parse(
    readFileSync("package.json", "utf-8")
  );

  if (!isPackageJson(packageJson)) {
    return fail("package.json needs a name and a version.");
  }

  return packageJson;
}

function writePackageJson(packageJson: PackageJson): void {
  writeFileSync("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
}

function resolveNextVersion(
  currentVersion: string,
  versionSpec: string
): string {
  const current = parseVersion(currentVersion);

  const [major, minor, patch] = current;

  if (versionSpec === "major") {
    return formatVersion([major + 1, 0, 0]);
  }

  if (versionSpec === "minor") {
    return formatVersion([major, minor + 1, 0]);
  }

  if (versionSpec === "patch") {
    return formatVersion([major, minor, patch + 1]);
  }

  const next = parseVersion(versionSpec);

  if (compareVersions(next, current) <= 0) {
    fail(
      `${versionSpec} must be greater than the current version ${currentVersion}.`
    );
  }

  return versionSpec;
}

function parseVersion(version: string): Version {
  const match = stableVersionPattern.exec(version);

  if (!match) {
    return fail(
      `Expected a stable semver version like 0.2.0, received "${version}".`
    );
  }

  const [, major, minor, patch] = match;

  return [Number(major), Number(minor), Number(patch)];
}

function compareVersions(left: Version, right: Version): number {
  for (const index of [0, 1, 2] as const) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
}

function formatVersion(version: Version): string {
  return version.join(".");
}

function ensureMainBranch(): void {
  // The package also lives inside the MappStock monorepo, which syncs it to
  // the mirror. Releasing from there would commit, tag and push MappStock's
  // own main, so a release runs only where the package is the repository root.
  const top = read("git", ["rev-parse", "--show-toplevel"]);

  if (realpathSync(top) !== realpathSync(root)) {
    fail(`Releases run from a clone of ${githubRepository}, not from ${top}.`);
  }

  const branch = read("git", ["branch", "--show-current"]);

  if (branch !== "main") {
    fail(
      `Releases must be prepared from main. Current branch: ${branch || "(detached)"}.`
    );
  }
}

function ensureCleanTree(): void {
  const status = read("git", ["status", "--porcelain"]);

  if (status) {
    fail(
      "Working tree is not clean. Commit or stash changes before releasing."
    );
  }
}

function tagExists(tagName: string): boolean {
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

function ghReleaseExists(tagName: string): boolean {
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

function findPublishRunId(tagName: string): string {
  for (let attempt = 0; attempt < publishRunLookupAttempts; attempt += 1) {
    const runs: unknown = JSON.parse(
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
    const publishRun = Array.isArray(runs)
      ? runs
          .filter(isWorkflowRun)
          .find((workflowRun) => workflowRun.headBranch === tagName)
      : undefined;

    if (publishRun) {
      return String(publishRun.databaseId);
    }

    sleep(publishRunLookupIntervalMs);
  }

  return fail(`Could not find the ${publishWorkflow} run for ${tagName}.`);
}

function read(file: string, args: string[]): string {
  return execFileSync(file, args, { encoding: "utf-8" }).trim();
}

function readIfSuccessful(file: string, args: string[]): string {
  try {
    return read(file, args);
  } catch {
    return "";
  }
}

function run(file: string, args: string[]): void {
  execFileSync(file, args, { stdio: "inherit" });
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function sleep(ms: number): void {
  Atomics.wait(
    new Int32Array(new SharedArrayBuffer(sharedBufferBytes)),
    0,
    0,
    ms
  );
}

function printUsage(): void {
  console.log(`Usage:
  bun run release patch
  bun run release minor
  bun run release major
  bun run release 0.2.0`);
}
