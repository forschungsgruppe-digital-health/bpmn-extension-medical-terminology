---
title: Version matrix
description: Published packages and the versions declared or resolved by their release tags.
---

This table lists publicly available release and release-candidate packages from npm or
GitHub Packages, using their Git tags. GitHub Packages may require authentication even for
public packages; private packages and other prereleases are excluded.
The registry snapshot is refreshed explicitly after publishing. The table separates
declared compatibility ranges from the exact demo dependencies resolved in each committed
lockfile. The lockfile versions are the repository's exercised integration stack, not an
exhaustive compatibility matrix for every version in the peer ranges.

The CI column reports the Node.js major configured in `validate.yml`; it does not pin the
runner's exact Node.js or npm patch version.

| Extension version | Source | Namespace URI | Declared peer ranges | Locked demo versions | CI Node |
| --- | --- | --- | --- | --- | --- |
| 1.0.0-rc.1 | terminology-v1.0.0-rc.1<br>npm | `mt: https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/ns/terminology/v1` | bpmn-js >=15.0.0<br>bpmn-js-properties-panel >=5.0.0<br>@bpmn-io/properties-panel >=3.0.0 | bpmn-js 18.14.0<br>bpmn-js-properties-panel 5.53.0<br>@bpmn-io/properties-panel 3.40.6<br>vite 6.4.3 | Node 24 |

After publishing, fetch all tags and refresh registry data with
`node tools/generate-version-matrix.mjs --refresh` (requires `gh` with `read:packages` and
`curl`). Commit the snapshot and table. Regenerate offline with `npm run docs:versions`;
verify with `npm run docs:versions:check`.
