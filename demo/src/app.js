import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import {
  createTerminologyModule,
  TerminologyModdleDescriptor,
  createTerminologyPropertiesPanelModule
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

import { DEMO_FEATURES } from './demo-config.js';
import { setupLanguageSwitch } from './i18n.js';
import { setupLicenseNotice } from './license-notice.js';
import { applyServerNotice } from './server-notice.js';
import { createThrottledFetch } from './live-search.js';
import { setupOptIn } from './opt-in.js';
import { addTerminologyNotices } from './terminology-notices.js';
import {
  createDemoOptInProviders,
  createDemoOptInSnomedProvider,
  createDemoTerminologyServices,
  describeDemoOptInServer,
  describeDemoOptInSnomed,
  describeDemoTerminologyServer
} from './terminology-config.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/properties-panel.css';
import './styles.css';

import annotatedBpmn from '../../examples/valid/lung-cancer-staging-annotated.bpmn?raw';
import plainBpmn from '../../examples/valid/lung-cancer-staging.bpmn?raw';

let modeler;

const SAMPLES = {
  annotated: {
    label: { de: 'Lungenkrebs — annotiert (mt:)', en: 'Lung cancer — annotated (mt:)' },
    xml: annotatedBpmn
  },
  plain: {
    label: { de: 'Lungenkrebs — reines BPMN (ohne Erweiterungen)', en: 'Lung cancer — plain BPMN (no extensions)' },
    xml: plainBpmn
  },
  demo: { label: { de: 'Demo-Beispiel', en: 'Demo sample' }, url: './sample.bpmn' }
};

let uiLanguage = 'en';

async function loadSample(key) {
  try {
    const sample = SAMPLES[key] || SAMPLES.annotated;
    const xml = sample.xml ?? (await (await fetch(sample.url)).text());
    await modeler.importXML(xml);
    modeler.get('canvas').zoom('fit-viewport');
  } catch (err) {
    console.error('Failed to load diagram', err);
  }
}

function setupSampleSelect() {
  const sampleSelect = document.getElementById('sample-select');

  if (!sampleSelect) {
    return;
  }

  for (const key of Object.keys(SAMPLES)) {
    const option = document.createElement('option');
    option.value = key;
    sampleSelect.appendChild(option);
  }

  updateSampleLabels();
  sampleSelect.value = 'annotated';
  sampleSelect.addEventListener('change', () => loadSample(sampleSelect.value));
}

function updateSampleLabels() {
  for (const option of document.querySelectorAll('#sample-select option')) {
    option.textContent = SAMPLES[option.value]?.label[uiLanguage] ?? option.value;
  }
}

// The XML view and the download carry the notices of the code systems the
// diagram uses: bpmn-moddle drops the sample diagrams' XML comments on import.
async function exportXml() {
  const { xml } = await modeler.saveXML({ format: true });

  return addTerminologyNotices(xml, modeler.getDefinitions());
}

function setVisibility(selector, isVisible) {
  const node = document.querySelector(selector);
  if (!node) {
    return null;
  }

  node.hidden = !isVisible;

  return node;
}

// Read once at module load: bootstrap() and the notices below depend on them.
const localServer = describeDemoTerminologyServer();
const optInServer = describeDemoOptInServer();
const optInSnomed = describeDemoOptInSnomed();

async function bootstrap() {
  const additionalModules = [];
  let terminologyServices = null;
  const moddleExtensions = {};

  if (DEMO_FEATURES.showPropertiesPanel) {
    additionalModules.push(
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule
    );
  }

  if (DEMO_FEATURES.showTerminology) {
    // Requests to a server from demo/.env.local are delayed (a request is
    // dropped while you keep typing) and cached per request URL. The panel
    // sends nothing below three characters (serverSearchMinLength), so the
    // fetch wrapper needs no minimum of its own here.
    terminologyServices = await createDemoTerminologyServices(import.meta.env, {
      fetchFn: localServer ? createThrottledFetch({ minTermLength: 0 }) : undefined
    });
    const terminologyServicesModule = createTerminologyModule(terminologyServices);

    additionalModules.push(
      createTerminologyPropertiesPanelModule({
        showAnnotations: DEMO_FEATURES.showTerminologyAnnotations,
        // The demo's fetch wrapper (createThrottledFetch) already waits for a
        // pause in typing and checks the live-search consent right before it
        // sends; a second delay in the panel would only double the wait.
        serverSearchDebounceMs: 0
      }),
      terminologyServicesModule
    );

    moddleExtensions.mt = TerminologyModdleDescriptor;
  }

  modeler = new BpmnModeler({
    container: '#canvas',
    ...(DEMO_FEATURES.showPropertiesPanel
      ? {
        propertiesPanel: {
          parent: '#properties'
        }
      }
      : {}),
    additionalModules,
    moddleExtensions
  });

  const downloadButton = setVisibility('#btn-download', DEMO_FEATURES.showXmlDownload);
  const xmlToggleButton = setVisibility('#btn-xml-toggle', DEMO_FEATURES.showXmlPreview);

  setVisibility('#properties', DEMO_FEATURES.showPropertiesPanel);
  setVisibility('.app-footer', DEMO_FEATURES.showFooter);

  const headerActions = document.querySelector('.app-header__actions');

  if (headerActions) {
    headerActions.hidden = !DEMO_FEATURES.showXmlDownload && !DEMO_FEATURES.showXmlPreview;
  }

  if (downloadButton) {
    downloadButton.addEventListener('click', async () => {
      const xml = await exportXml();
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'medical-terminology.bpmn';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const xmlOverlay = document.getElementById('xml-overlay');
  const xmlContent = document.getElementById('xml-content');

  if (xmlToggleButton) {
    xmlToggleButton.addEventListener('click', async () => {
      xmlContent.textContent = await exportXml();
      xmlOverlay.classList.remove('xml-overlay--hidden');
    });
  }

  const xmlCloseButton = document.getElementById('btn-xml-close');
  if (xmlCloseButton) {
    xmlCloseButton.addEventListener('click', () => {
      xmlOverlay.classList.add('xml-overlay--hidden');
    });
  }

  setupSampleSelect();
  await loadSample('annotated');

  // Public demo: live search on the opt-in server only after separate consent,
  // and SNOMED CT on top of it only after a licence self-declaration. Each
  // request checks its consent again right before it is sent, so a search
  // still waiting in the delay is dropped once that consent is withdrawn.
  setupOptIn({
    server: terminologyServices ? optInServer : null,
    snomed: optInSnomed,
    registry: terminologyServices?.terminologyRegistry ?? null,
    createProviders: createDemoOptInProviders,
    createSnomedProvider: createDemoOptInSnomedProvider
  });
}

// German or English, from the browser's preferred languages; not stored.
setupLanguageSwitch({
  onChange: language => {
    uiLanguage = language;
    updateSampleLabels();
  }
});
applyServerNotice(document, localServer);
setupLicenseNotice();

void bootstrap().catch(err => {
  console.error('Failed to bootstrap demo', err);
});
