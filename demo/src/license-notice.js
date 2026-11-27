export const LICENSE_NOTICE_ACK_KEY = 'fdh-demo-license-notice-ack-v4';
export const REPO_MAINPAGE_URL =
  'https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

function resolveDefaultStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function isLicenseNoticeAcknowledged(storage = resolveDefaultStorage()) {
  try {
    return storage?.getItem(LICENSE_NOTICE_ACK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markLicenseNoticeAcknowledged(storage = resolveDefaultStorage()) {
  try {
    storage?.setItem(LICENSE_NOTICE_ACK_KEY, 'true');
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

export function setupLicenseNotice({
  doc = document,
  storage = resolveDefaultStorage(),
  navigate = (url) => window.location.assign(url),
  repoUrl = REPO_MAINPAGE_URL
} = {}) {
  const overlay = doc.getElementById('license-overlay');
  const acceptButton = doc.getElementById('btn-license-accept');
  const rejectButton = doc.getElementById('btn-license-reject');
  const closeButton = doc.getElementById('btn-license-close');
  const bannerButton = doc.getElementById('btn-license-notice');
  const footerButton = doc.getElementById('btn-footer-license');

  if (!overlay || !acceptButton) {
    return;
  }

  let acknowledged = isLicenseNoticeAcknowledged(storage);

  // The page labels the button in both languages (`[data-accept-label]`
  // variants "accept" and "close"); without them, plain English text.
  function setAcceptLabel(variant) {
    const labels = [ ...acceptButton.querySelectorAll('[data-accept-label]') ];

    if (!labels.length) {
      acceptButton.textContent = variant === 'accept' ? 'Accept' : 'Close';
      return;
    }

    for (const label of labels) {
      label.hidden = label.getAttribute('data-accept-label') !== variant;
    }
  }

  function openDialog({ requireAck = false } = {}) {
    overlay.classList.remove('license-overlay--hidden');
    if (closeButton) {
      closeButton.hidden = requireAck;
    }
    if (rejectButton) {
      rejectButton.hidden = !requireAck;
    }
    setAcceptLabel(requireAck ? 'accept' : 'close');
    acceptButton.focus();
  }

  function closeDialog({ acknowledge = false } = {}) {
    if (acknowledge) {
      acknowledged = true;
      markLicenseNoticeAcknowledged(storage);
    }
    overlay.classList.add('license-overlay--hidden');
  }

  acceptButton.addEventListener('click', () => {
    closeDialog({ acknowledge: true });
  });

  if (rejectButton) {
    rejectButton.addEventListener('click', () => {
      navigate(repoUrl);
    });
  }

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

  doc.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      acknowledged &&
      !overlay.classList.contains('license-overlay--hidden')
    ) {
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
  } else {
    closeDialog();
  }
}
