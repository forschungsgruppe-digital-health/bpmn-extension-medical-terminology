#!/usr/bin/env node
/**
 * Single source of truth for *which* `.bpmn` files the conformance checks cover.
 *
 * Used by:
 *   - tools/lint-bpmn.mjs        (import)
 *   - tools/moddle-roundtrip.mjs (import)
 *   - tools/validate-xsd.sh      (CLI: `node tools/bpmn-files.mjs`)
 *
 * Behaviour:
 *   - With explicit `.bpmn` path arguments  -> use those (filtered to existing files).
 *     This lets git hooks pass the staged files only.
 *   - With no arguments                     -> discover every tracked `.bpmn` under
 *     the ROOTS below, excluding build output and dependencies.
 *
 * CLI usage:
 *   node tools/bpmn-files.mjs            # print discovered files, one per line
 *   node tools/bpmn-files.mjs a.bpmn b   # echo the given files (existing ones only)
 */
import { readdirSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Directories scanned for `.bpmn` files when no explicit paths are given. */
// Only current terminology fixtures are part of the default conformance set.
const ROOTS = ['examples/valid', 'docs'];

/** Directory names never descended into (build output, deps, VCS). */
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);

function walk(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc; // missing root -> nothing to add
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), acc);
    } else if (entry.isFile() && entry.name.endsWith('.bpmn')) {
      acc.push(join(dir, entry.name));
    }
  }
  return acc;
}

/**
 * @param {string[]} argv command-line arguments (may contain flags and paths)
 * @returns {string[]} sorted list of existing `.bpmn` file paths
 */
export function resolveBpmnFiles(argv = []) {
  const explicit = argv.filter((a) => a.endsWith('.bpmn'));
  if (explicit.length) {
    return explicit.filter((f) => existsSync(f)).sort();
  }
  const found = [];
  for (const root of ROOTS) walk(root, found);
  return found.sort();
}

function isMain() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  // Tolerate a consumer closing the pipe early (e.g. `| head`).
  process.stdout.on('error', (e) => {
    if (e && e.code === 'EPIPE') process.exit(0);
  });
  const files = resolveBpmnFiles(process.argv.slice(2));
  if (files.length) process.stdout.write(files.join('\n') + '\n');
}
