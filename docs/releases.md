# Releases

This package publishes from GitHub Actions after a version tag is pushed. A regular commit to `main` only runs CI and updates the GitHub repo. It does not publish to npm.

## Trusted publishing

The publish workflow is designed for npm trusted publishing, so the repository does not need a long-lived `NPM_TOKEN`.

Configure npm with:

```sh
npm trust github tanstack-router-cache --repo santiago-ramos-02/tanstack-router-cache --file publish.yml --env npm-publish --allow-publish
```

## Publishing a version

Work in the package repo:

```sh
cd packages/tanstack-router-cache
```

For normal changes:

```sh
bun run check
git add .
git commit -m "Your change"
git push origin main
```

That updates GitHub and runs CI, but it does not publish to npm.

For a release, start from a clean `main` branch after your changes are already committed:

```sh
bun run release:prepare patch
bun run release:push
```

Use `minor`, `major`, or an exact version when needed:

```sh
bun run release:prepare minor
bun run release:prepare 0.2.0
```

`release:prepare` updates `package.json`, runs the package checks, commits the version bump, and creates the matching tag locally. `release:push` pushes `main` and that exact tag. The tag starts the npm publish workflow.

The workflow checks that the tag matches `package.json` before publishing, so a mismatched tag cannot publish accidentally.
