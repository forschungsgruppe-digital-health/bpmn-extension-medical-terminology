# npm staging automation

`release-please.yml` calls `npm-stage.yml` after creating a package release.
The staging workflow checks out the exact release tag, checks coupled versions,
and runs `npm run verify`. It extracts the publishable workspace tarball into
a temporary directory and changes only that copy's registry to npmjs.org.
GitHub Packages and the repository's `publishConfig` remain unchanged.

Prereleases are staged with the `rc` tag; stable versions use `latest`. Staging
never approves or rejects a version automatically. The receipt and stage ID
appear in the run log and summary. Duplicate staged/published versions fail
explicitly; retries do not overwrite them.

## Initial setup

The initial staging smoke test uses a granular stage-only token stored as
`NPM_STAGING_TOKEN`. Once the package exists, ongoing staging uses OIDC without
an npm secret. Configure two stage-only GitHub Trusted Publishers on npm:

- Owner: `forschungsgruppe-digital-health`.
- Repository: `bpmn-extension-medical-terminology`.
- Workflow `release-please.yml` for automatic staging through the reusable workflow.
- Workflow `npm-stage.yml` for manual staging.
- Allow staging only; do not allow direct publishing.

npm validates the calling workflow identity for reusable workflows, so the
automatic and manual entry points each need a publisher. Both caller and
callee declare `id-token: write`. Revoke the bootstrap token and remove its
GitHub secret once setup is complete. No second smoke upload is required by
this procedure; the first future genuine RC run verifies OIDC end to end.

An initial stage of a new package creates a public `0.0.0-stage` placeholder.
The candidate's contents remain staged until approval. Rejecting a candidate
does not necessarily remove that placeholder.

Trusted Publisher setup and stage rejection require maintainer 2FA. The
workflow cannot approve its own stages.

## Manual smoke test

The prepared package and coupled release metadata use `1.0.0-rc.1`.
Release Please is explicitly configured for that first RC. After its real
release, remove or advance `release-as`; before a stable release also disable
prerelease mode. Do not merge a release PR as part of the staging smoke test.

After this workflow is available on the default branch, run `npm-stage` in
GitHub Actions with an existing tag (for example `terminology-v0.1.9`) and
`test_version: 1.0.0-rc.1`. For old tags without `check:versions`, also supply
`smoke_commit` with the full SHA of a verified current `dev` commit and supply
the matching version tag (for this preparation: `terminology-v1.0.0-rc.1`).
That tag need not exist in smoke mode. The workflow verifies that commit
instead of the old tag. Normal release calls always check out the release tag.
This overrides only the npm copy's package version;
it does not create a release, change source metadata, or publish to GitHub
Packages. It is an authentication/transport test, not an actual RC.

Download and inspect the stage following the [checklist](RELEASE-TESTING.md).
Then an authenticated maintainer rejects the exact stage ID:

```bash
npm stage reject <stage-id> --registry=https://registry.npmjs.org
```

Reject requires interactive 2FA and cannot be performed by the staging token
or GitHub OIDC. Do not approve the smoke test. Verify its removal with
`npm stage list` before running a real candidate with the same version.

For normal manual retries, supply only the release tag and leave `test_version`
empty. All checked-out release metadata must already agree.

References: [npm stage](https://docs.npmjs.com/cli/v11/commands/npm-stage/),
[trusted publishers](https://docs.npmjs.com/trusted-publishers/).
