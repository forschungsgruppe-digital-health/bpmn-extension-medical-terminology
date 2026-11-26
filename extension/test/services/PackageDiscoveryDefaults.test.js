import { afterEach, describe, expect, it } from 'vitest';
import {
  EXCLUDED_HL7_CODE_SYSTEMS,
  THIRD_PARTY_IP_MARKER,
  getHl7ExclusionReason
} from '../../src/providers/presets/hl7-exclusions.js';
import {
  filterDefaultPackageRegistry,
  getDefaultPackageResourceFilter
} from '../../src/services/PackageDiscoveryDefaults.js';
import { createDefaultPackageProviders } from '../../src/config/terminology-config.js';

const SNODENT_URL = 'http://www.ada.org/snodent';
const GLOBAL_KEY = '__FDH_TERMINOLOGY_PACKAGES__';

// Synthetic stand-ins: only the canonical URL and the copyright text matter.
function createCodeSystem(url, extra = {}) {
  return {
    resourceType: 'CodeSystem',
    url,
    concept: [{ code: 'SYN-1', display: 'Synthetic concept' }],
    ...extra
  };
}

const ACT_CODE = createCodeSystem('http://terminology.hl7.org/CodeSystem/v3-ActCode');
const SNODENT = createCodeSystem(SNODENT_URL);
const MARKED_THIRD_PARTY = createCodeSystem('http://terminology.hl7.org/CodeSystem/synthetic-third-party', {
  copyright: `Owned by a synthetic third party ${THIRD_PARTY_IP_MARKER}.`
});

describe('getHl7ExclusionReason', () => {
  it('lists the third-party code systems the bundled preset leaves out', () => {
    expect(Object.keys(EXCLUDED_HL7_CODE_SYSTEMS).sort()).toEqual([
      'http://terminology.hl7.org/CodeSystem/ADAToothSurfaceCodes',
      'http://terminology.hl7.org/CodeSystem/ADAUniversalToothDesignationSystem',
      'http://terminology.hl7.org/CodeSystem/color-names',
      'http://terminology.hl7.org/CodeSystem/color-rgb',
      'http://terminology.hl7.org/CodeSystem/v3-HealthcareProviderTaxonomyHIPAA',
      SNODENT_URL
    ]);
    expect(Object.isFrozen(EXCLUDED_HL7_CODE_SYSTEMS)).toBe(true);
  });

  it('returns the listed reason for an excluded URL', () => {
    expect(getHl7ExclusionReason({ url: SNODENT_URL }))
      .toBe('SNODENT, American Dental Association; marked as Third Party IP');
  });

  it('prefers the URL list over the copyright marker', () => {
    expect(getHl7ExclusionReason({
      url: SNODENT_URL,
      copyright: THIRD_PARTY_IP_MARKER
    })).toBe(EXCLUDED_HL7_CODE_SYSTEMS[SNODENT_URL]);
  });

  it('excludes any code system marked as Third Party IP in its copyright', () => {
    expect(getHl7ExclusionReason(MARKED_THIRD_PARTY))
      .toBe('marked as Third Party IP in CodeSystem.copyright');
  });

  it('returns null for HL7 content that may be redistributed', () => {
    expect(getHl7ExclusionReason(ACT_CODE)).toBeNull();
    expect(getHl7ExclusionReason({ url: 'toString' })).toBeNull();
    expect(getHl7ExclusionReason(null)).toBeNull();
    expect(getHl7ExclusionReason(undefined)).toBeNull();
  });
});

describe('getDefaultPackageResourceFilter', () => {
  it('drops third-party code systems from hl7.terminology.r4 with a resource predicate', () => {
    const filter = getDefaultPackageResourceFilter('hl7.terminology.r4');

    // A predicate, not `exclude` selectors: a release without SNODENT must not
    // make discovery fail or skip the package.
    expect(filter).not.toHaveProperty('exclude');
    expect(filter).not.toHaveProperty('include');
    expect(filter.excludeResource(SNODENT)).toBe(EXCLUDED_HL7_CODE_SYSTEMS[SNODENT_URL]);
    expect(filter.excludeResource(ACT_CODE)).toBeNull();
  });

  it('keeps the include filters of the other default packages', () => {
    expect(getDefaultPackageResourceFilter('dvmd.kdl.r4')).toEqual({
      include: ['http://dvmd.de/fhir/CodeSystem/kdl'],
      warnOnMissing: true
    });
    expect(getDefaultPackageResourceFilter('example.terminology')).toEqual({});
  });
});

describe('filterDefaultPackageRegistry', () => {
  it('drops third-party code systems from hl7.terminology.r4', () => {
    expect(filterDefaultPackageRegistry({
      'hl7.terminology.r4': [SNODENT, ACT_CODE, MARKED_THIRD_PARTY]
    })).toEqual({
      'hl7.terminology.r4': [ACT_CODE]
    });
  });

  it('also filters a version-keyed hl7.terminology.r4 entry', () => {
    expect(filterDefaultPackageRegistry({
      'hl7.terminology.r4@7.1.0': [ACT_CODE, SNODENT]
    })).toEqual({
      'hl7.terminology.r4@7.1.0': [ACT_CODE]
    });
  });

  it('omits a package left empty by the filter', () => {
    expect(filterDefaultPackageRegistry({
      'hl7.terminology.r4': [SNODENT]
    })).toEqual({});
  });
});

describe('runtime package discovery of hl7.terminology.r4', () => {
  const previousValue = globalThis[GLOBAL_KEY];

  afterEach(() => {
    if (previousValue === undefined) {
      delete globalThis[GLOBAL_KEY];
    } else {
      globalThis[GLOBAL_KEY] = previousValue;
    }
  });

  function getHl7CodeSystemUris(providers, providerId) {
    return providers.find(provider => provider.id === providerId).getCodeSystemUris();
  }

  it('drops third-party code systems from the globally exposed registry', () => {
    globalThis[GLOBAL_KEY] = {
      'hl7.terminology.r4': [ACT_CODE, SNODENT, MARKED_THIRD_PARTY]
    };

    const presetUris = getHl7CodeSystemUris(
      createDefaultPackageProviders({}),
      'hl7-terminology-r4-package'
    );
    const discoveredUris = getHl7CodeSystemUris(
      createDefaultPackageProviders({ enablePackageDefaults: false }),
      'pkg-hl7-terminology-r4'
    );

    expect(presetUris).toEqual([ACT_CODE.url]);
    expect(discoveredUris).toEqual([ACT_CODE.url]);
  });

  it('drops third-party code systems found through packageAutoDiscovery.globFn', () => {
    // Vite's import.meta.glob with `import: 'default'` maps paths to resources.
    const globFn = () => ({
      '/node_modules/hl7.terminology.r4/CodeSystem-v3-ActCode.json': ACT_CODE,
      '/node_modules/hl7.terminology.r4/CodeSystem-v3-ada-snodent.json': SNODENT
    });

    const uris = getHl7CodeSystemUris(
      createDefaultPackageProviders({
        enablePackageDefaults: false,
        packageAutoDiscovery: { globFn }
      }),
      'pkg-hl7-terminology-r4'
    );

    expect(uris).toEqual([ACT_CODE.url]);
  });

  it('keeps an explicit package selection as the integrator chose it', () => {
    const explicitPackages = {
      'hl7.terminology.r4': [ACT_CODE, SNODENT]
    };

    const fromPackageDiscovery = getHl7CodeSystemUris(
      createDefaultPackageProviders({
        enablePackageDefaults: false,
        packageAutoDiscovery: false,
        packageDiscovery: { enabled: true, packages: explicitPackages }
      }),
      'pkg-hl7-terminology-r4'
    );
    const fromAutoDiscoveryPackages = getHl7CodeSystemUris(
      createDefaultPackageProviders({
        enablePackageDefaults: false,
        packageAutoDiscovery: { packages: explicitPackages }
      }),
      'pkg-hl7-terminology-r4'
    );

    expect(fromPackageDiscovery).toEqual([ACT_CODE.url, SNODENT_URL]);
    expect(fromAutoDiscoveryPackages).toEqual([ACT_CODE.url, SNODENT_URL]);
  });
});
