// @vitest-environment jsdom

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

const serviceState = vi.hoisted(() => ({
  current: {}
}));

vi.mock('bpmn-js-properties-panel', () => ({
  useService(name, strict = true) {
    if (name in serviceState.current) {
      return serviceState.current[name];
    }

    if (strict === false) {
      return undefined;
    }

    throw new Error(`Missing mocked service: ${name}`);
  }
}));

vi.mock('@bpmn-io/properties-panel/preact/hooks', () => ({
  useEffect,
  useRef,
  useState
}));

vi.mock('@bpmn-io/properties-panel', () => ({
  TextFieldEntry(props) {
    const [localValue, setLocalValue] = useState(props.getValue(props.element) || '');
    const error = props.validate ? props.validate(localValue) : null;

    useEffect(() => {
      setLocalValue(props.getValue(props.element) || '');
    }, [ props.element, props.getValue ]);

    return h('div', {
      class: `bio-properties-panel-entry ${error ? 'has-error' : ''}`,
      'data-entry-id': props.id
    }, [
      h('div', { class: 'bio-properties-panel-textfield' }, [
        h('label', {
          class: 'bio-properties-panel-label',
          for: `bio-properties-panel-${props.id}`
        }, props.label),
        h('input', {
          id: `bio-properties-panel-${props.id}`,
          class: 'bio-properties-panel-input',
          type: 'text',
          value: localValue,
          placeholder: props.placeholder,
          onInput: (event) => {
            const value = event.target.value;
            setLocalValue(value);
            props.setValue(value, props.validate ? props.validate(value) : null);
          }
        })
      ]),
      error ? h('div', { class: 'bio-properties-panel-error' }, error) : null,
      props.description ? h('div', { class: 'bio-properties-panel-description' }, props.description) : null
    ]);
  },
  TextAreaEntry(props) {
    const [localValue, setLocalValue] = useState(props.getValue(props.element) || '');
    const error = props.validate ? props.validate(localValue) : null;

    useEffect(() => {
      setLocalValue(props.getValue(props.element) || '');
    }, [ props.element, props.getValue ]);

    return h('div', {
      class: `bio-properties-panel-entry ${error ? 'has-error' : ''}`,
      'data-entry-id': props.id
    }, [
      h('div', { class: 'bio-properties-panel-textarea' }, [
        h('label', {
          class: 'bio-properties-panel-label',
          for: `bio-properties-panel-${props.id}`
        }, props.label),
        h('textarea', {
          id: `bio-properties-panel-${props.id}`,
          class: 'bio-properties-panel-input',
          rows: props.rows || 2,
          value: localValue,
          placeholder: props.placeholder,
          onInput: (event) => {
            const value = event.target.value;
            setLocalValue(value);
            props.setValue(value, props.validate ? props.validate(value) : null);
          }
        })
      ]),
      error ? h('div', { class: 'bio-properties-panel-error' }, error) : null,
      props.description ? h('div', { class: 'bio-properties-panel-description' }, props.description) : null
    ]);
  }
}));

const PROVIDERS = [
  { id: 'snomed-ct', displayName: 'SNOMED CT', systemUri: 'http://snomed.info/sct' },
  { id: 'loinc', displayName: 'LOINC', systemUri: 'http://loinc.org' },
  { id: 'ops', displayName: 'OPS', systemUri: 'http://fhir.de/CodeSystem/bfarm/ops', version: '2021' },
  { id: 'atc', displayName: 'ATC', systemUri: 'http://www.whocc.no/atc', version: '2025.0.0' },
  { id: 'kdl', displayName: 'KDL', systemUri: 'http://dvmd.de/fhir/CodeSystem/kdl', version: '2024' },
  { id: 'ihe-xds-type', displayName: 'IHE XDS typeCode', systemUri: 'http://ihe-d.de/CodeSystems/IHEXDStypeCode', version: '2020-02-07T07:55:58' },
  { id: 'ihe-xds-class', displayName: 'IHE XDS classCode', systemUri: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode', version: '2021-06-25T13:44:47' }
];

const SEARCH_RESULTS = {
  'snomed-ct': [
    { code: '254292007', display: 'Tumor staging (tumor staging)', system: 'http://snomed.info/sct' },
    { code: '367336001', display: 'Chemotherapy (procedure)', system: 'http://snomed.info/sct' },
    { code: '359615001', display: 'Partial lobectomy of lung (procedure)', system: 'http://snomed.info/sct' },
    { code: '390906007', display: 'Follow-up encounter (procedure)', system: 'http://snomed.info/sct' }
  ],
  loinc: [
    { code: '21908-9', display: 'Stage group.clinical Cancer', system: 'http://loinc.org' },
    { code: '18748-4', display: 'Diagnostic imaging study', system: 'http://loinc.org' },
    { code: '18842-5', display: 'Discharge summary', system: 'http://loinc.org' },
    { code: '18776-5', display: 'Plan of care note', system: 'http://loinc.org' }
  ],
  ops: [
    { code: '5-324', display: 'Simple lobectomy and bilobectomy of the lung', system: 'http://fhir.de/CodeSystem/bfarm/ops', version: '2021' }
  ],
  atc: [
    { code: 'L01XA01', display: 'Cisplatin', system: 'http://www.whocc.no/atc', version: '2025.0.0' }
  ],
  kdl: [
    { code: 'AD010101', display: 'Medical discharge report', system: 'http://dvmd.de/fhir/CodeSystem/kdl', version: '2024' }
  ],
  'ihe-xds-type': [
    { code: 'ERGE', display: 'Diagnostic imaging results', system: 'http://ihe-d.de/CodeSystems/IHEXDStypeCode', version: '2020-02-07T07:55:58' }
  ],
  'ihe-xds-class': [
    { code: 'BEF', display: 'Clinical reports', system: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode', version: '2021-06-25T13:44:47' },
    { code: 'BRI', display: 'Physician letters', system: 'http://ihe-d.de/CodeSystems/IHEXDSclassCode', version: '2021-06-25T13:44:47' }
  ]
};

let AnnotationListEntry;
let ClinicalDomainEntry;

describe('terminology properties panel UI', () => {
  beforeAll(async () => {
    ({ AnnotationListEntry } = await import('../../src/properties-panel/entries/AnnotationListEntry.js'));
    ({ ClinicalDomainEntry } = await import('../../src/properties-panel/entries/ClinicalDomainEntry.js'));
  });

  beforeEach(() => {
    globalThis.requestAnimationFrame = (callback) => {
      callback();
      return 0;
    };

    globalThis.cancelAnimationFrame = () => {};
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    serviceState.current = {};
  });

  it('recreates the staging task terminology annotation via the UI', async () => {
    const context = await createTestContext({
      id: 'Task_Staging',
      type: 'bpmn:Task',
      name: 'Perform TNM Staging'
    });

    setServices(context);

    const clinicalDomainView = render(h(ClinicalDomainEntry, { element: context.element }));
    fireEvent.change(screen.getByLabelText('Clinical domain'), {
      target: { value: 'staging' }
    });
    clinicalDomainView.unmount();

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));
    await createAnnotation(annotationView.container, {
      text: 'Clinical TNM staging to determine tumor stage',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Tumor staging',
          resultLabel: 'Tumor staging (tumor staging)'
        },
        {
          providerId: 'loinc',
          searchTerm: 'Stage group',
          resultLabel: 'Stage group.clinical Cancer'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('Task_Staging', xml);

    expect(xml).toContain('id="Task_Staging"');
    expect(xml).toContain('term:clinicalDomain="staging"');
    expect(xml).toContain('<term:annotation id="term-ann-1" text="Clinical TNM staging to determine tumor stage">');
    expect(xml).toContain('<term:coding system="http://snomed.info/sct" code="254292007" display="Tumor staging (tumor staging)"');
    expect(xml).toContain('<term:coding system="http://loinc.org" code="21908-9" display="Stage group.clinical Cancer"');
    expect(xml).not.toContain('fhirmap:');
  });

  it('does not render the FHIR mapping target section', async () => {
    const context = await createTestContext({
      id: 'Task_NoMappingTarget',
      type: 'bpmn:Task',
      name: 'No Mapping Target Task'
    });

    setServices(context);

    render(h(AnnotationListEntry, { element: context.element }));
    fireEvent.click(screen.getByText('+ Add annotation'));

    expect(screen.queryByText('Mapping target (optional)')).toBeNull();
  });

  it('sorts the terminology dropdown alphabetically when providers change at runtime', async () => {
    const context = await createTestContext({
      id: 'Task_DynamicProviders',
      type: 'bpmn:Task',
      name: 'Dynamic Providers Task'
    });

    const providers = [PROVIDERS[0]];
    const listeners = new Map();

    const terminologyRegistry = {
      listProviders: () => providers,
      search: vi.fn(async (term, providerId) => ({
        items: SEARCH_RESULTS[providerId].filter((concept) =>
          concept.display.toLowerCase().includes(term.toLowerCase())
        )
      })),
      on(event, listener) {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }

        listeners.get(event).add(listener);
      },
      off(event, listener) {
        listeners.get(event)?.delete(listener);
      }
    };

    setServices(context, { terminologyRegistry });

    const view = render(h(AnnotationListEntry, { element: context.element }));
    fireEvent.click(screen.getByText('+ Add annotation'));

    const terminologySelect = getControlByLabel(view.container, 'Terminology');
    expect(Array.from(terminologySelect.options).map(option => option.value)).toEqual(['', 'snomed-ct']);

    providers.push(PROVIDERS[1]);
    await waitFor(() => expect(listeners.get('provider:registered')).toBeDefined());
    listeners.get('provider:registered').forEach(listener => listener());

    await waitFor(() => {
      expect(Array.from(terminologySelect.options).map(option => option.value)).toEqual(['', 'loinc', 'snomed-ct']);
    });
  });

  it('sorts terminology providers by their displayed name', async () => {
    const context = await createTestContext({
      id: 'Task_SortedProviders',
      type: 'bpmn:Task',
      name: 'Sorted Providers Task'
    });

    setServices(context, {
      terminologyRegistry: {
        listProviders: () => [...PROVIDERS].reverse(),
        search: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
      }
    });

    const view = render(h(AnnotationListEntry, { element: context.element }));
    fireEvent.click(screen.getByText('+ Add annotation'));

    const terminologySelect = getControlByLabel(view.container, 'Terminology');

    expect(Array.from(terminologySelect.options).map(option => option.textContent)).toEqual([
      '– select –',
      'ATC',
      'IHE XDS classCode',
      'IHE XDS typeCode',
      'KDL',
      'LOINC',
      'OPS',
      'SNOMED CT'
    ]);
  });

  it('hides the terminology dropdown when no providers are available', async () => {
    const context = await createTestContext({
      id: 'Task_NoProviders',
      type: 'bpmn:Task',
      name: 'No Providers Task'
    });

    setServices(context, {
      terminologyRegistry: {
        listProviders: () => [],
        search: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
      }
    });

    render(h(AnnotationListEntry, { element: context.element }));
    fireEvent.click(screen.getByText('+ Add annotation'));

    expect(screen.queryByLabelText('Terminology')).toBeNull();
    expect(screen.getByText('No terminology systems are available right now.')).toBeTruthy();
  });

  it('persists a manually entered ID', async () => {
    const context = await createTestContext({
      id: 'Task_CustomAnn',
      type: 'bpmn:Task',
      name: 'Configured Task'
    });

    setServices(context);

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));
    await createAnnotation(annotationView.container, {
      id: 'thorax-report-type',
      text: 'Thorax report',
      codings: []
    });

    const xml = await serializeXml(context.moddle, context.definitions);

    expect(xml).toContain('<term:annotation id="thorax-report-type" text="Thorax report" />');
  });

  it('persists the terminology code system version in XML', async () => {
    const context = await createTestContext({
      id: 'Task_VersionedCode',
      type: 'bpmn:Task',
      name: 'Versioned Code Task'
    });

    setServices(context, {
      terminologyRegistry: {
        listProviders: () => PROVIDERS,
        search: vi.fn(async (term, providerId) => ({
          items: [{
            code: '254292007',
            display: 'Tumor staging (tumor staging)',
            system: 'http://snomed.info/sct',
            version: '2024-09'
          }]
        })),
        on: vi.fn(),
        off: vi.fn()
      }
    });

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));
    await createAnnotation(annotationView.container, {
      text: 'Versioned coding',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Tumor staging',
          resultLabel: 'Tumor staging (tumor staging)'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);

    expect(xml).toContain('<term:coding system="http://snomed.info/sct" version="2024-09" code="254292007" display="Tumor staging (tumor staging)"');
  });

  it('persists the SNOMED release version in XML', async () => {
    const context = await createTestContext({
      id: 'Task_SnomedVersion',
      type: 'bpmn:Task',
      name: 'SNOMED Version Task'
    });

    setServices(context, {
      terminologyRegistry: {
        listProviders: () => PROVIDERS,
        search: vi.fn(async () => ({
          items: [{
            code: '233604007',
            display: 'Pneumonia',
            system: 'http://snomed.info/sct',
            version: '20240901'
          }]
        })),
        on: vi.fn(),
        off: vi.fn()
      }
    });

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));
    await createAnnotation(annotationView.container, {
      text: 'SNOMED coding',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'pneumonia',
          resultLabel: 'Pneumonia'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);

    expect(xml).toContain('<term:coding system="http://snomed.info/sct" version="20240901" code="233604007" display="Pneumonia"');
  });

  it('uses the selected provider version when a search result omits one', async () => {
    const context = await createTestContext({
      id: 'Task_ProviderVersionFallback',
      type: 'bpmn:Task',
      name: 'Provider Version Fallback Task'
    });
    const provider = {
      ...PROVIDERS[0],
      version: '2024-09'
    };

    setServices(context, {
      terminologyRegistry: {
        listProviders: () => [provider],
        search: vi.fn(async () => ({
          items: [{
            code: '254292007',
            display: 'Tumor staging (tumor staging)',
            system: 'http://snomed.info/sct'
          }]
        }))
      }
    });

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));
    await createAnnotation(annotationView.container, {
      text: 'Provider version fallback',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Tumor staging',
          resultLabel: 'Tumor staging (tumor staging)'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);

    expect(xml).toContain('<term:coding system="http://snomed.info/sct" version="2024-09" code="254292007" display="Tumor staging (tumor staging)"');
  });

  it('blocks duplicate terminology codes with the same system', async () => {
    const context = await createTestContext({
      id: 'Task_DuplicateCode',
      type: 'bpmn:Task',
      name: 'Duplicate Code Task'
    });

    setServices(context);

    const view = render(h(AnnotationListEntry, { element: context.element }));

    await createAnnotation(view.container, {
      text: 'First annotation',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Tumor staging',
          resultLabel: 'Tumor staging (tumor staging)'
        }
      ]
    });

    fireEvent.click(screen.getByText('+ Add annotation'));
    fireEvent.input(getControlByLabel(view.container, 'Free text'), {
      target: { value: 'Second annotation' }
    });
    fireEvent.change(getControlByLabel(view.container, 'Terminology'), {
      target: { value: 'snomed-ct' }
    });

    const searchInput = getControlByLabel(view.container, 'Search');
    fireEvent.focus(searchInput);
    fireEvent.input(searchInput, {
      target: { value: 'Tumor staging' }
    });

    const suggestion = await waitFor(() => {
      const match = Array.from(view.container.querySelectorAll('.search-suggestion'))
        .find((node) => node.querySelector('.search-suggestion__label')?.textContent === 'Tumor staging (tumor staging)');

      expect(match).toBeTruthy();
      return match;
    });

    fireEvent.mouseDown(suggestion);
    fireEvent.click(screen.getByText('Save annotation'));

    expect(screen.getByText('A terminology code with the same system and code is already used in the diagram.')).toBeTruthy();

    const xml = await serializeXml(context.moddle, context.definitions);
    expect((xml.match(/<term:annotation\b/g) || [])).toHaveLength(1);
  });

  it('marks the ID field and shows its error below the field', async () => {
    const context = await createTestContext({
      id: 'Task_InvalidAnn',
      type: 'bpmn:Task',
      name: 'Configured Task'
    });

    setServices(context);

    const view = render(h(AnnotationListEntry, { element: context.element }));
    fireEvent.click(screen.getByText('+ Add annotation'));
    fireEvent.input(getControlByLabel(view.container, 'ID'), {
      target: { value: 'invalid id' }
    });
    fireEvent.input(getControlByLabel(view.container, 'Free text'), {
      target: { value: 'Thorax report' }
    });
    fireEvent.click(screen.getByText('Save annotation'));

    expect(screen.getByText('ID may only contain letters, numbers, dots, underscores, and hyphens.')).toBeTruthy();
    expect(getControlByLabel(view.container, 'ID').closest('.bio-properties-panel-entry').className).toContain('has-error');
  });

  it('recreates the chemotherapy task without adding unsupported target data', async () => {
    const context = await createTestContext({
      id: 'Task_Chemo',
      type: 'bpmn:Task',
      name: 'Systemic Chemotherapy'
    });

    setServices(context);

    const clinicalDomainView = render(h(ClinicalDomainEntry, { element: context.element }));
    fireEvent.change(screen.getByLabelText('Clinical domain'), {
      target: { value: 'therapy' }
    });
    clinicalDomainView.unmount();

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));
    await createAnnotation(annotationView.container, {
      
      text: 'Cisplatin-based doublet chemotherapy for inoperable lung cancer Stage III-IV',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Chemotherapy',
          resultLabel: 'Chemotherapy (procedure)'
        },
        {
          providerId: 'atc',
          searchTerm: 'Cisplatin',
          resultLabel: 'Cisplatin'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('Task_Chemo', xml);

    expect(xml).toContain('id="Task_Chemo"');
    expect(xml).toContain('term:clinicalDomain="therapy"');
    expect(xml).toContain('<term:annotation id="term-ann-1" text="Cisplatin-based doublet chemotherapy for inoperable lung cancer Stage III-IV">');
    expect(xml).toContain('<term:coding system="http://snomed.info/sct" code="367336001" display="Chemotherapy (procedure)"');
    expect(xml).toContain('<term:coding system="http://www.whocc.no/atc" version="2025.0.0" code="L01XA01" display="Cisplatin"');
  });

  it('recreates the discharge letter data object annotations via the UI', async () => {
    const context = await createTestContext({
      id: 'DataObj_DischargeLetter',
      type: 'bpmn:DataObjectReference',
      name: 'Discharge Letter'
    });

    setServices(context);

    const clinicalDomainView = render(h(ClinicalDomainEntry, { element: context.element }));
    fireEvent.change(screen.getByLabelText('Clinical domain'), {
      target: { value: 'documentation' }
    });
    clinicalDomainView.unmount();

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));

    await createAnnotation(annotationView.container, {
      text: 'Medical discharge report upon completion of follow-up',
      codings: [
        {
          providerId: 'loinc',
          searchTerm: 'Discharge',
          resultLabel: 'Discharge summary'
        },
        {
          providerId: 'kdl',
          searchTerm: 'Medical discharge',
          resultLabel: 'Medical discharge report'
        }
      ]
    });

    await createAnnotation(annotationView.container, {
      codings: [
        {
          providerId: 'ihe-xds-class',
          searchTerm: 'Physician',
          resultLabel: 'Physician letters'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('DataObj_DischargeLetter', xml);

    expect(xml).toContain('id="DataObj_DischargeLetter"');
    expect(xml).toContain('term:clinicalDomain="documentation"');
    expect(xml).toContain('<term:annotation id="term-ann-1" text="Medical discharge report upon completion of follow-up">');
    expect(xml).toContain('<term:coding system="http://loinc.org" code="18842-5" display="Discharge summary"');
    expect(xml).toContain('<term:coding system="http://dvmd.de/fhir/CodeSystem/kdl" version="2024" code="AD010101" display="Medical discharge report"');
    expect(xml).toContain('<term:annotation id="term-ann-2">');
    expect(xml).toContain('<term:coding system="http://ihe-d.de/CodeSystems/IHEXDSclassCode" version="2021-06-25T13:44:47" code="BRI" display="Physician letters"');
  });

  it('recreates the MRI data object annotations via the UI', async () => {
    const context = await createTestContext({
      id: 'DataObj_MRI',
      type: 'bpmn:DataObjectReference',
      name: 'MRI Scan Report'
    });

    setServices(context);

    const clinicalDomainView = render(h(ClinicalDomainEntry, { element: context.element }));
    fireEvent.change(screen.getByLabelText('Clinical domain'), {
      target: { value: 'diagnostics' }
    });
    clinicalDomainView.unmount();

    const annotationView = render(h(AnnotationListEntry, { element: context.element }));

    await createAnnotation(annotationView.container, {
      text: 'MRI scan report of the thorax as input document for TNM staging',
      codings: [
        {
          providerId: 'loinc',
          searchTerm: 'Diagnostic imaging',
          resultLabel: 'Diagnostic imaging study'
        },
        {
          providerId: 'ihe-xds-type',
          searchTerm: 'Diagnostic imaging',
          resultLabel: 'Diagnostic imaging results'
        }
      ]
    });

    await createAnnotation(annotationView.container, {
      codings: [
        {
          providerId: 'ihe-xds-class',
          searchTerm: 'Clinical reports',
          resultLabel: 'Clinical reports'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('DataObj_MRI', xml);

    expect(xml).toContain('id="DataObj_MRI"');
    expect(xml).toContain('term:clinicalDomain="diagnostics"');
    expect(xml).toContain('<term:annotation id="term-ann-1" text="MRI scan report of the thorax as input document for TNM staging">');
    expect(xml).toContain('<term:coding system="http://loinc.org" code="18748-4" display="Diagnostic imaging study"');
    expect(xml).toContain('<term:coding system="http://ihe-d.de/CodeSystems/IHEXDStypeCode" version="2020-02-07T07:55:58" code="ERGE" display="Diagnostic imaging results"');
    expect(xml).toContain('<term:coding system="http://ihe-d.de/CodeSystems/IHEXDSclassCode" version="2021-06-25T13:44:47" code="BEF" display="Clinical reports"');
  });

  it('recreates the terminology-only reference cross section via the UI', async () => {
    const context = await createProcessContext([
      { id: 'DataObj_MRI', type: 'bpmn:DataObjectReference', name: 'MRI Scan Report' },
      { id: 'Task_Staging', type: 'bpmn:Task', name: 'Perform TNM Staging' },
      { id: 'Gateway_Split', type: 'bpmn:ExclusiveGateway', name: 'Tumor Stage?' },
      { id: 'Task_Surgery', type: 'bpmn:Task', name: 'Surgical Resection' },
      { id: 'Task_Chemo', type: 'bpmn:Task', name: 'Systemic Chemotherapy' },
      { id: 'DataObj_DischargeLetter', type: 'bpmn:DataObjectReference', name: 'Discharge Letter' },
      { id: 'Task_Followup', type: 'bpmn:Task', name: 'Follow-up Assessment' }
    ]);

    setServices(context);

    await setClinicalDomain(context, 'DataObj_MRI', 'diagnostics');
    await addAnnotationToElement(context, 'DataObj_MRI', {
      text: 'MRI scan report of the thorax as input document for TNM staging',
      codings: [
        {
          providerId: 'loinc',
          searchTerm: 'Diagnostic imaging',
          resultLabel: 'Diagnostic imaging study'
        },
        {
          providerId: 'ihe-xds-type',
          searchTerm: 'Diagnostic imaging',
          resultLabel: 'Diagnostic imaging results'
        }
      ]
    });
    await addAnnotationToElement(context, 'DataObj_MRI', {
      codings: [
        {
          providerId: 'ihe-xds-class',
          searchTerm: 'Clinical reports',
          resultLabel: 'Clinical reports'
        }
      ]
    });

    await setClinicalDomain(context, 'Task_Staging', 'staging');
    await addAnnotationToElement(context, 'Task_Staging', {
      text: 'Clinical TNM staging to determine tumor stage',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Tumor staging',
          resultLabel: 'Tumor staging (tumor staging)'
        },
        {
          providerId: 'loinc',
          searchTerm: 'Stage group',
          resultLabel: 'Stage group.clinical Cancer'
        }
      ]
    });

    await addAnnotationToElement(context, 'Gateway_Split', {
      text: 'Treatment decision based on TNM stage: Stage I-II (operable) vs. Stage III-IV (inoperable)',
      codings: []
    });

    await setClinicalDomain(context, 'Task_Surgery', 'therapy');
    await addAnnotationToElement(context, 'Task_Surgery', {
      
      text: 'Lobectomy or pneumonectomy for operable lung cancer Stage I-II',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Partial lobectomy',
          resultLabel: 'Partial lobectomy of lung (procedure)'
        },
        {
          providerId: 'ops',
          searchTerm: 'lobectomy',
          resultLabel: 'Simple lobectomy and bilobectomy of the lung'
        }
      ]
    });

    await setClinicalDomain(context, 'Task_Chemo', 'therapy');
    await addAnnotationToElement(context, 'Task_Chemo', {
      
      text: 'Cisplatin-based doublet chemotherapy for inoperable lung cancer Stage III-IV',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Chemotherapy',
          resultLabel: 'Chemotherapy (procedure)'
        },
        {
          providerId: 'atc',
          searchTerm: 'Cisplatin',
          resultLabel: 'Cisplatin'
        }
      ]
    });

    await setClinicalDomain(context, 'DataObj_DischargeLetter', 'documentation');
    await addAnnotationToElement(context, 'DataObj_DischargeLetter', {
      text: 'Medical discharge report upon completion of follow-up',
      codings: [
        {
          providerId: 'loinc',
          searchTerm: 'Discharge',
          resultLabel: 'Discharge summary'
        },
        {
          providerId: 'kdl',
          searchTerm: 'Medical discharge',
          resultLabel: 'Medical discharge report'
        }
      ]
    });
    await addAnnotationToElement(context, 'DataObj_DischargeLetter', {
      codings: [
        {
          providerId: 'ihe-xds-class',
          searchTerm: 'Physician',
          resultLabel: 'Physician letters'
        }
      ]
    });

    await setClinicalDomain(context, 'Task_Followup', 'follow-up');
    await addAnnotationToElement(context, 'Task_Followup', {
      text: 'Structured follow-up assessment with imaging surveillance and lab monitoring',
      codings: [
        {
          providerId: 'snomed-ct',
          searchTerm: 'Follow-up encounter',
          resultLabel: 'Follow-up encounter (procedure)'
        },
        {
          providerId: 'loinc',
          searchTerm: 'Plan of care',
          resultLabel: 'Plan of care note'
        }
      ]
    });

    const xml = await serializeXml(context.moddle, context.definitions);
    maybePrintXml('Reference_Cross_Section', xml);

    expect(xml).toContain('id="Gateway_Split"');
    expect(xml).toContain('Treatment decision based on TNM stage: Stage I-II (operable) vs. Stage III-IV (inoperable)');
    expect(xml).toContain('id="Task_Surgery"');
    expect(xml).toContain('<term:coding system="http://fhir.de/CodeSystem/bfarm/ops" version="2021" code="5-324" display="Simple lobectomy and bilobectomy of the lung"');
    expect(xml).toContain('id="Task_Followup"');
    expect(xml).toContain('<term:coding system="http://loinc.org" code="18776-5" display="Plan of care note"');
    expect(xml).not.toContain('fhirmap:');
  });
});

async function createTestContext({ id, type, name }) {
  const context = await createProcessContext([
    { id, type, name }
  ]);

  return {
    ...context,
    element: context.elements[id]
  };
}

async function createProcessContext(elementDefinitions) {
  const { default: descriptor } = await import('../../src/moddle/clinical.json');
  const moddle = new BpmnModdle({ term: descriptor });
  const process = moddle.create('bpmn:Process', {
    id: 'Process_1',
    isExecutable: false,
    flowElements: []
  });
  const definitions = moddle.create('bpmn:Definitions', {
    id: 'Definitions_1',
    targetNamespace: 'https://example.invalid/bpmn',
    rootElements: [ process ]
  });

  process.$parent = definitions;
  const elements = {};

  for (const definition of elementDefinitions) {
    let businessObject;

    if (definition.type === 'bpmn:DataObjectReference') {
      const dataObject = moddle.create('bpmn:DataObject', {
        id: `${definition.id}_Source`
      });

      businessObject = moddle.create(definition.type, {
        id: definition.id,
        name: definition.name,
        dataObjectRef: dataObject
      });

      dataObject.$parent = process;
      businessObject.$parent = process;
      process.flowElements.push(dataObject, businessObject);
    } else {
      businessObject = moddle.create(definition.type, {
        id: definition.id,
        name: definition.name
      });
      businessObject.$parent = process;
      process.flowElements.push(businessObject);
    }

    elements[definition.id] = { businessObject };
  }

  const modeling = {
    updateModdleProperties: vi.fn((element, bo, properties) => {
      Object.entries(properties).forEach(([key, value]) => {
        bo.set(key, value);
      });
    })
  };

  return {
    definitions,
    elements,
    modeling,
    moddle
  };
}

function setServices(context, overrides = {}) {
  serviceState.current = {
    moddle: context.moddle,
    modeling: context.modeling,
    elementRegistry: {
      forEach(callback) {
        Object.values(context.elements).forEach(callback);
      }
    },
    translate: (value) => value,
    terminologyRegistry: {
      listProviders: () => PROVIDERS,
      search: vi.fn(async (term, providerId) => ({
        items: SEARCH_RESULTS[providerId].filter((concept) =>
          concept.display.toLowerCase().includes(term.toLowerCase())
        )
      }))
    },
    ...overrides
  };
}

async function createAnnotation(container, config) {
  fireEvent.click(screen.getByText('+ Add annotation'));

  if (config.id) {
    fireEvent.input(getControlByLabel(container, 'ID'), {
      target: { value: config.id }
    });
  }


  if (config.text) {
    fireEvent.input(getControlByLabel(container, 'Free text'), {
      target: { value: config.text }
    });
  }

  for (let index = 0; index < config.codings.length; index++) {
    const coding = config.codings[index];

    fireEvent.change(getControlByLabel(container, 'Terminology'), {
      target: { value: coding.providerId }
    });

    const searchInput = getControlByLabel(container, 'Search');

    fireEvent.focus(searchInput);
    fireEvent.input(searchInput, {
      target: { value: coding.searchTerm }
    });

    const suggestion = await waitFor(() => {
      const match = Array.from(container.querySelectorAll('.search-suggestion'))
        .find((node) => node.querySelector('.search-suggestion__label')?.textContent === coding.resultLabel);

      expect(match).toBeTruthy();
      return match;
    });

    fireEvent.mouseDown(suggestion);

    await waitFor(() => {
      expect(container.querySelectorAll('.selected-coding')).toHaveLength(index + 1);
    });
  }

  if (config.codings.length > 0) {
    const finalSearchInput = getControlByLabel(container, 'Search');

    fireEvent.keyDown(finalSearchInput, {
      key: 'Tab'
    });
  } else {
    fireEvent.keyDown(getControlByLabel(container, 'Terminology'), {
      key: 'Tab'
    });
  }

  await waitFor(() => {
    expect(screen.queryByText('+ Add annotation')).toBeTruthy();
  });
}

async function setClinicalDomain(context, elementId, value) {
  const view = render(h(ClinicalDomainEntry, { element: context.elements[elementId] }));
  fireEvent.change(screen.getByLabelText('Clinical domain'), {
    target: { value }
  });
  view.unmount();
}

async function addAnnotationToElement(context, elementId, config) {
  const view = render(h(AnnotationListEntry, { element: context.elements[elementId] }));
  await createAnnotation(view.container, config);
  view.unmount();
}

function getControlByLabel(container, labelText) {
  const label = Array.from(container.querySelectorAll('label'))
    .find((node) => node.textContent.trim().startsWith(labelText));

  if (!label) {
    throw new Error(`Could not find label: ${labelText}`);
  }

  const row = label.closest('.form-row') || label.parentElement;
  const control = row.querySelector('select, textarea, input');

  if (!control) {
    throw new Error(`Could not find control for label: ${labelText}`);
  }

  return control;
}

async function serializeXml(moddle, definitions) {
  const { xml } = await moddle.toXML(definitions, { format: true });
  return xml;
}

function maybePrintXml(label, xml) {
  if (!process.env.PRINT_TERMINOLOGY_UI_XML) {
    return;
  }

  console.log(`\n----- ${label} -----\n${xml}\n`);
}
