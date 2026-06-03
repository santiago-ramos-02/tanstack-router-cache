import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8")
);
const expectedTag = `v${packageJson.version}`;
const actualTag = process.argv[2];

if (actualTag !== expectedTag) {
  console.error(
    `Release tag ${actualTag} does not match package version ${packageJson.version}. Expected ${expectedTag}.`
  );
  process.exit(1);
}

console.log(`Release tag ${actualTag} matches package version.`);
