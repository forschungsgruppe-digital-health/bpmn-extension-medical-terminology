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

Create a granular npm token with stage-only write permission for the
`@forschungsgruppe-digital-health` scope, including new-package creation, and
store it as the repository Actions secret `NPM_STAGING_TOKEN`. npm normalizes
neither the scope nor account permissions through the workflow: the token's
account must be allowed to publish there. Never commit the token.

An initial stage of a new package creates a public `0.0.0-stage` placeholder.
The candidate's contents remain staged until approval. Rejecting a candidate
does not necessarily remove that placeholder.

Once the package exists, a maintainer can configure a stage-only GitHub Trusted
Publisher on npm. Switching this workflow to OIDC is a separate change: add
`id-token: write` to caller and callee, stop requiring the token, and revoke it
after a successful OIDC stage. Until then, renew the token before expiration.

## Manual smoke test

After this workflow is available on the default branch, run `npm-stage` in
GitHub Actions with an existing tag (for example `terminology-v0.1.9`) and
`test_version: 1.0.0-rc.1`. For old tags without `check:versions`, also supply
`smoke_commit` with the full SHA of a verified current `dev` commit whose
package version matches the supplied tag. The workflow verifies that commit
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
