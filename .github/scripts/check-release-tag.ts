import { readFileSync } from "node:fs";

type Manifest = {
  version: string;
};

function isManifest(value: unknown): value is Manifest {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    typeof value.version === "string"
  );
}

const packageJson: unknown = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf-8")
);

if (!isManifest(packageJson)) {
  console.error("package.json has no version.");
  process.exit(1);
}

const expectedTag = `v${packageJson.version}`;
const actualTag: string | undefined = process.argv[2];

if (actualTag !== expectedTag) {
  console.error(
    `Release tag ${actualTag} does not match package version ${packageJson.version}. Expected ${expectedTag}.`
  );
  process.exit(1);
}

console.log(`Release tag ${actualTag} matches package version.`);
