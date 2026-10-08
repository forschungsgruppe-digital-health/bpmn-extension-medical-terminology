import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkNamespaceConsistency } from '../../../tools/check-namespace-consistency.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const files = [
  'extension/src/moddle/medical-terminology.json',
  'schema/medical-terminology.xsd',
  'README.md',
  'schema/README.md',
  'docs/ARCHITECTURE.md',
  'docs/EXTENDING.md',
  'docs/arc42/02_architecture_constraints.md',
  'docs/arc42/04_solution_strategy.md',
  'docs/arc42/08_crosscutting_concepts.md',
  'docs/arc42/09_architecture_decisions.md',
  'docs/arc42/12_glossary.md',
  'docs-site/src/content/docs/index.md',
  'docs-site/src/content/docs/schema.md',
  'docs-site/src/content/docs/ns/terminology/v1.md'
];

describe('namespace consistency check', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'terminology-namespace-'));
    for (const file of files) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      cpSync(join(repoRoot, file), join(root, file));
    }
    cpSync(join(repoRoot, 'examples'), join(root, 'examples'), { recursive: true });
    cpSync(join(repoRoot, 'demo/public'), join(root, 'demo/public'), { recursive: true });
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const rewrite = (file, from, to) => {
    const path = join(root, file);
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll(from, to));
  };

  it('accepts the repository artifacts', () => {
    expect(checkNamespaceConsistency(root).errors).toEqual([]);
  });

  it('rejects a stale generated XSD namespace', () => {
    rewrite('schema/medical-terminology.xsd', '/ns/terminology/v1', '/ns/terminology/v2');
    expect(checkNamespaceConsistency(root).errors[0]).toContain('targetNamespace');
  });

  it('rejects a BPMN file bound to a different terminology namespace', () => {
    rewrite('examples/valid/minimal-valid.bpmn', '/ns/terminology/v1', '/ns/terminology/v2');
    expect(checkNamespaceConsistency(root).errors[0]).toContain('minimal-valid.bpmn');
  });

  it('rejects current documentation that omits the canonical URI', () => {
    rewrite('README.md', /https:\/\/forschungsgruppe-digital-health[^\s"<)]+\/ns\/terminology\/v1/g, 'namespace-v1');
    expect(checkNamespaceConsistency(root).errors[0]).toContain('README.md');
  });
});
