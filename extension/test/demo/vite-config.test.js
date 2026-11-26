import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDemoViteConfig } from '../../../demo/vite.config.js';
import { findPackageRoot } from '../../../demo/build/third-party-licenses.js';

describe('demo Vite configuration', () => {
  it('does not configure a terminology or Snowstorm proxy', () => {
    const config = createDemoViteConfig();

    expect(config.plugins.map(plugin => plugin.name)).toEqual(['demo-third-party-licenses']);
    expect(config.server?.proxy).toBeUndefined();
  });

  it('writes the third-party licences of bundled packages', () => {
    const plugin = createDemoViteConfig().plugins[0];
    const emitted = [];
    const moduleIds = [
      resolve(import.meta.dirname, '../../../node_modules/bpmn-js/lib/Modeler.js'),
      resolve(import.meta.dirname, '../../../demo/src/app.js')
    ];

    plugin.generateBundle.call({
      getModuleIds: () => moduleIds[Symbol.iterator](),
      emitFile: file => emitted.push(file)
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].fileName).toBe('THIRD_PARTY_LICENSES.txt');
    expect(emitted[0].source).toContain('bpmn-js@');
    expect(emitted[0].source).toContain('bpmn.io');
    expect(emitted[0].source).toContain('Technische Universität Dresden');
    expect(findPackageRoot(moduleIds[1])).toBeNull();
  });
});
