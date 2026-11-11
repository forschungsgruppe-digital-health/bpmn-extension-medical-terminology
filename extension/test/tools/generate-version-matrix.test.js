import { describe, expect, it } from 'vitest';
import { compareVersionsDescending, publishedVersions } from '../../../tools/generate-version-matrix.mjs';

describe('published version matrix', () => {
  it('combines real published versions from both registries without npm stubs', () => {
    expect(publishedVersions(
      { versions: { '0.0.0-stage': { stub: true }, '1.0.0-rc.1': {} } },
      [ { name: '1.0.0-rc.1' }, { name: '0.10.0' } ]
    )).toEqual({
      '1.0.0-rc.1': [ 'npm', 'GitHub Packages' ],
      '0.10.0': [ 'GitHub Packages' ]
    });
  });

  it('sorts releases and prereleases in descending semver order', () => {
    const versions = [ '0.1.9', '1.0.0-rc.2', '1.0.0', '1.0.0-rc.10', '0.10.0', '1.0.0-rc' ];
    expect(versions.sort(compareVersionsDescending)).toEqual([
      '1.0.0', '1.0.0-rc.10', '1.0.0-rc.2', '1.0.0-rc', '0.10.0', '0.1.9'
    ]);
  });
});
