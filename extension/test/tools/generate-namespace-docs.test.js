import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  namespaceLocation,
  renderNamespacePage
} from '../../../tools/generate-namespace-docs.mjs';

const descriptor = JSON.parse(readFileSync(
  fileURLToPath(new URL('../../src/moddle/medical-terminology.json', import.meta.url)),
  'utf8'
));

describe('namespace documentation generator', () => {
  it('maps the controlled namespace to its stable documentation route', () => {
    const location = namespaceLocation(descriptor);

    expect(location.formatVersion).toBe('v1');
    expect(location.markdownPath).toMatch(/docs-site\/src\/content\/docs\/ns\/terminology\/v1\.md$/);
    expect(location.publicPath).toMatch(/docs-site\/public\/ns\/terminology\/v1$/);
  });

  it('renders every moddle type and property from the descriptor', () => {
    const page = renderNamespacePage(descriptor);

    for (const type of descriptor.types) {
      expect(page).toContain(`\`mt:${type.name.charAt(0).toLowerCase()}${type.name.slice(1)}\``);
      for (const property of type.properties || []) {
        expect(page).toContain(`\`${property.name}\``);
      }
    }
    expect(page).toContain(`${descriptor.uri}/medical-terminology.json`);
    expect(page).toContain(`${descriptor.uri}/medical-terminology.xsd`);
  });

  it('rejects namespace authorities and routes outside the documented family contract', () => {
    expect(() => namespaceLocation({
      ...descriptor,
      uri: 'https://example.invalid/ns/terminology/v1'
    })).toThrow(/must be below/);
    expect(() => namespaceLocation({
      ...descriptor,
      uri: 'https://forschungsgruppe-digital-health.github.io/bpmn-extension-medical-terminology/terminology/v1'
    })).toThrow(/must be below/);
  });
});
