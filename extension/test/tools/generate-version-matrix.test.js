import { describe, expect, it } from 'vitest';
import { compareVersionsDescending, publishedVersions } from '../../../tools/generate-version-matrix.mjs';

describe('published version matrix', () => {
  it('includes only releases and release candidates from public registries', () => {
    expect(publishedVersions(
      { versions: { '0.0.0-stage': { stub: true }, '1.0.0-rc.1': {}, '1.0.0-beta.1': {} } },
      [ { name: '1.0.0-rc.1' }, { name: '0.10.0' }, { name: '1.0.0-alpha.1' } ],
      'public'
    )).toEqual({
      '1.0.0-rc.1': [ 'npm', 'GitHub Packages' ],
      '0.10.0': [ 'GitHub Packages' ]
    });
  });

  it('excludes versions of a private GitHub package even when they are published', () => {
    expect(publishedVersions(
      { versions: { '1.0.0-rc.1': {} } },
      [ { name: '1.0.0-rc.1' }, { name: '1.0.0-rc.2' }, { name: '0.10.0' } ],
      'private'
    )).toEqual({ '1.0.0-rc.1': [ 'npm' ] });
  });

  it('rejects unknown visibility instead of assuming the package is public', () => {
    expect(() => publishedVersions({ versions: {} }, [], 'unknown')).toThrow('visibility');
  });

  it('sorts releases and prereleases in descending semver order', () => {
    const versions = [ '0.1.9', '1.0.0-rc.2', '1.0.0', '1.0.0-rc.10', '0.10.0', '1.0.0-rc' ];
    expect(versions.sort(compareVersionsDescending)).toEqual([
      '1.0.0', '1.0.0-rc.10', '1.0.0-rc.2', '1.0.0-rc', '0.10.0', '0.1.9'
    ]);
  });
});
