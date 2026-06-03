# Releases

This package publishes from GitHub Actions after a version tag is pushed.

## Trusted publishing

The publish workflow is designed for npm trusted publishing, so the repository does not need a long-lived `NPM_TOKEN`.

Configure npm with:

```sh
npm trust github tanstack-router-cache --repo santiago-ramos-02/tanstack-router-cache --file publish.yml --env npm-publish --allow-publish
```

## Publishing a version

1. Update `version` in `package.json`.
2. Commit the change.
3. Tag the same version:

```sh
git tag v0.2.0
git push origin main --tags
```

The workflow checks that the tag matches `package.json` before publishing.
