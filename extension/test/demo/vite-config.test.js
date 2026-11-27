import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDemoViteConfig } from '../../../demo/vite.config.js';
import {
  findPackageRoot,
  LICENSE_OVERRIDES,
  renderThirdPartyLicenses
} from '../../../demo/build/third-party-licenses.js';
import { KDL_NOTICE } from '../../../demo/src/terminology-notices.js';

const NODE_MODULES = resolve(import.meta.dirname, '../../../node_modules');
const collapse = text => text.replace(/\s+/g, ' ').trim();

function packageSection(output, name) {
  return output
    .split(/^-{72}$/m)
    .find(section => section.trimStart().startsWith(`${name}@`));
}

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

  it('names the KDL licence, its DVMD notice and source, although the KDL manifest declares none', () => {
    const output = renderThirdPartyLicenses([
      resolve(NODE_MODULES, 'dvmd.kdl.r4/CodeSystem-kdl-2026-0-0.json'),
      resolve(NODE_MODULES, 'dvmd.kdl.r4/package.json'),
      resolve(NODE_MODULES, 'de.ihe-d.terminology/package.json')
    ]);
    const kdl = packageSection(output, 'dvmd.kdl.r4');
    const ihe = packageSection(output, 'de.ihe-d.terminology');

    expect(Object.keys(LICENSE_OVERRIDES)).toEqual([ 'dvmd.kdl.r4@2026.0.0' ]);
    expect(kdl).toContain('dvmd.kdl.r4@2026.0.0\nLicense: GPL-3.0-or-later (stated by DVMD in the KDL 2026 ' +
      'guide; the package manifest declares none)\n');
    expect(kdl).not.toContain('not declared');
    // The notice is the licence dialog's KDL_NOTICE, wrapped, not a copy.
    expect(collapse(kdl)).toContain(collapse(KDL_NOTICE));
    expect(collapse(kdl)).toContain('Copyright 2013–2018 DMI GmbH & Co. KG; since 2018 DVMD e.V.');
    expect(collapse(kdl)).toContain('The KDL is provided without any warranty');
    expect(kdl).toContain('<https://packages.simplifier.net/dvmd.kdl.r4/2026.0.0>');
    // GPL-3.0 section 4: every recipient gets a copy of the licence, not only a link.
    expect(kdl).not.toContain('No licence file');
    expect(kdl).toMatch(/GNU GENERAL PUBLIC LICENSE\s+Version 3, 29 June 2007/);
    expect(collapse(kdl)).toContain('the demo build supplies the licence text');
    expect(kdl).toContain('END OF TERMS AND CONDITIONS');
    const [ kdlNotice ] = kdl.split(/^\s*GNU GENERAL PUBLIC LICENSE$/m);
    expect(kdlNotice.split('\n').filter(line => !line.startsWith('License:')).every(line => line.length <= 72)).toBe(true);

    // Other packages without a declared licence stay as their manifest says.
    expect(ihe).toContain('License: not declared');
    expect(ihe).not.toContain('GNU GENERAL PUBLIC LICENSE');
  });

  it('supplies the unmodified GPL-3.0 text from the repository', () => {
    const gplText = readFileSync(resolve(import.meta.dirname, '../../../demo/build/licenses/GPL-3.0.txt'), 'utf8');
    const output = renderThirdPartyLicenses([ resolve(NODE_MODULES, 'dvmd.kdl.r4/package.json') ]);

    expect(gplText.startsWith('                    GNU GENERAL PUBLIC LICENSE\n                       Version 3, 29 June 2007\n')).toBe(true);
    expect(gplText).toContain('Everyone is permitted to copy and distribute verbatim copies');
    // Verbatim, including the indentation of the title lines.
    expect(output).toContain(gplText.trimEnd());
  });

  it('applies the KDL override only to the release whose licence statement was checked', () => {
    const manifest = JSON.parse(readFileSync(resolve(NODE_MODULES, 'dvmd.kdl.r4/package.json'), 'utf8'));

    expect(manifest.license).toBeUndefined();
    expect(`${manifest.name}@${manifest.version}`).toBe('dvmd.kdl.r4@2026.0.0');
  });
});
