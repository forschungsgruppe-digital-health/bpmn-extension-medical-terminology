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
import {
  createDemoTerminologyServices
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
  annotated: { label: 'Lung cancer — annotated (mt:)', xml: annotatedBpmn },
  plain: { label: 'Lung cancer — plain BPMN (no extensions)', xml: plainBpmn },
  demo: { label: 'Demo sample', url: './sample.bpmn' }
};

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

  for (const [key, sample] of Object.entries(SAMPLES)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = sample.label;
    sampleSelect.appendChild(option);
  }

  sampleSelect.value = 'annotated';
  sampleSelect.addEventListener('change', () => loadSample(sampleSelect.value));
}

const LICENSE_NOTICE_ACK_KEY = 'fdh-demo-license-notice-ack-v1';

function isLicenseNoticeAcknowledged() {
  try {
    return window.sessionStorage.getItem(LICENSE_NOTICE_ACK_KEY) === 'true';
  } catch {
    return false;
  }
}

function markLicenseNoticeAcknowledged() {
  try {
    window.sessionStorage.setItem(LICENSE_NOTICE_ACK_KEY, 'true');
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

function setupLicenseNotice() {
  const overlay = document.getElementById('license-overlay');
  const acceptButton = document.getElementById('btn-license-accept');
  const closeButton = document.getElementById('btn-license-close');
  const bannerButton = document.getElementById('btn-license-notice');
  const footerButton = document.getElementById('btn-footer-license');

  if (!overlay || !acceptButton) {
    return;
  }

  let acknowledged = isLicenseNoticeAcknowledged();

  function openDialog({ requireAck = false } = {}) {
    overlay.classList.remove('license-overlay--hidden');
    if (closeButton) {
      closeButton.hidden = requireAck;
    }
    acceptButton.textContent = requireAck
      ? 'I understand — open demo for preview only'
      : 'Close';
    acceptButton.focus();
  }

  function closeDialog({ acknowledge = false } = {}) {
    if (acknowledge) {
      acknowledged = true;
      markLicenseNoticeAcknowledged();
    }
    overlay.classList.add('license-overlay--hidden');
  }

  acceptButton.addEventListener('click', () => {
    closeDialog({ acknowledge: true });
  });

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (acknowledged) {
        closeDialog();
      }
    });
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay && acknowledged) {
      closeDialog();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && acknowledged && !overlay.classList.contains('license-overlay--hidden')) {
      closeDialog();
    }
  });

  const reopen = () => openDialog({ requireAck: !acknowledged });
  if (bannerButton) {
    bannerButton.addEventListener('click', reopen);
  }
  if (footerButton) {
    footerButton.addEventListener('click', reopen);
  }

  if (!acknowledged) {
    openDialog({ requireAck: true });
  }
}

function setVisibility(selector, isVisible) {
  const node = document.querySelector(selector);
  if (!node) {
    return null;
  }

  node.hidden = !isVisible;

  return node;
}

async function bootstrap() {
  const additionalModules = [];
  const moddleExtensions = {};

  if (DEMO_FEATURES.showPropertiesPanel) {
    additionalModules.push(
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule
    );
  }

  if (DEMO_FEATURES.showTerminology) {
    const terminologyServices = await createDemoTerminologyServices();
    const terminologyServicesModule = createTerminologyModule(terminologyServices);

    additionalModules.push(
      createTerminologyPropertiesPanelModule({
        showAnnotations: DEMO_FEATURES.showTerminologyAnnotations
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
      const { xml } = await modeler.saveXML({ format: true });
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
      const { xml } = await modeler.saveXML({ format: true });
      xmlContent.textContent = xml;
      xmlOverlay.classList.remove('xml-overlay--hidden');
    });
  }

  const xmlCloseButton = document.getElementById('btn-xml-close');
  if (xmlCloseButton) {
    xmlCloseButton.addEventListener('click', () => {
      xmlOverlay.classList.add('xml-overlay--hidden');
    });
  }

  setupLicenseNotice();
  setupSampleSelect();
  await loadSample('annotated');
}

void bootstrap().catch(err => {
  console.error('Failed to bootstrap demo', err);
});
