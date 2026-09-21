import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkSiteLinks } from '../../../tools/check-site-links.mjs';

const roots = [];

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'site-links-'));
  roots.push(root);
  for (const [name, body] of Object.entries(files)) {
    const target = join(root, name);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, body);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('checkSiteLinks', () => {
  it('accepts root-relative, page-relative, asset, and fragment links', () => {
    const root = fixture({
      'index.html': '<main id="top"><a href="/project/guide/#details">Guide</a></main>',
      'guide/index.html': '<h1 id="details">Guide</h1><a href="../">Home</a><img src="../asset.svg">',
      'asset.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    });

    const result = checkSiteLinks(root, '/project');

    expect(result.broken.size).toBe(0);
    expect(result.unprefixed.size).toBe(0);
    expect(result.missingFragments.size).toBe(0);
  });

  it('reports relative paths and fragments that do not resolve', () => {
    const root = fixture({
      'index.html': '<a href="guide/">Guide</a>',
      'guide/index.html': '<a href="../adr/missing.md">ADR</a><a href="#absent">Section</a>'
    });

    const result = checkSiteLinks(root, '/project');

    expect([...result.broken.keys()]).toContain(
      '../adr/missing.md -> /project/adr/missing.md'
    );
    expect([...result.missingFragments.keys()]).toContain('#absent -> #absent');
  });

  it('reports root-relative paths that omit the deployment base', () => {
    const root = fixture({
      'index.html': '<a href="/schema/">Schema</a>'
    });

    const result = checkSiteLinks(root, '/project');

    expect([...result.unprefixed.keys()]).toEqual(['/schema/']);
  });
});
