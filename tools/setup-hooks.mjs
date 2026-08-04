#!/usr/bin/env node
/**
 * Point git at the committed hooks in `.githooks/` (run automatically by the
 * root `prepare` script on `npm install`).
 *
 * Vendor-neutral and dependency-free: instead of a hook manager (husky etc.) we
 * just set `core.hooksPath`. Bulletproof by design — it never fails the install:
 * if this is not a git checkout, or git is unavailable, it prints a notice and
 * exits 0.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(join(repoRoot, '.git'))) {
  // Installed as a dependency / tarball, or not a git checkout — nothing to do.
  process.exit(0);
}
if (!existsSync(join(repoRoot, '.githooks'))) {
  process.exit(0);
}

const res = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: repoRoot,
  stdio: 'ignore',
});

if (res.status === 0) {
  console.log('setup-hooks: git hooks enabled (core.hooksPath = .githooks).');
} else {
  console.log('setup-hooks: could not configure git hooks (non-fatal). Run `npm run hooks:install` manually.');
}
process.exit(0);
