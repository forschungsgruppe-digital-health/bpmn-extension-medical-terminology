// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LICENSE_NOTICE_ACK_KEY,
  REPO_MAINPAGE_URL,
  setupLicenseNotice
} from '../../../demo/src/license-notice.js';

const DEMO_HTML_PATH = resolve(import.meta.dirname, '../../../demo/index.html');
const DEMO_HTML = readFileSync(DEMO_HTML_PATH, 'utf8');

function loadDemoDocument() {
  document.documentElement.innerHTML = DEMO_HTML;
}

describe('demo license notice dialog', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    loadDemoDocument();
  });

  it('shows Reject and Accept buttons on first run and blocks dismissal until accepted', () => {
    const navigate = vi.fn();

    setupLicenseNotice({ doc: document, storage: window.sessionStorage, navigate });

    const overlay = document.getElementById('license-overlay');
    const rejectButton = document.getElementById('btn-license-reject');
    const acceptButton = document.getElementById('btn-license-accept');
    const closeButton = document.getElementById('btn-license-close');

    expect(overlay.classList.contains('license-overlay--hidden')).toBe(false);
    expect(rejectButton.hidden).toBe(false);
    expect(rejectButton.textContent.trim()).toBe('Reject');
    expect(acceptButton.textContent.trim()).toBe('Accept');
    expect(closeButton.hidden).toBe(true);

    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(overlay.classList.contains('license-overlay--hidden')).toBe(false);
  });

  it('navigates to the repository main page when Reject is clicked', () => {
    const navigate = vi.fn();

    setupLicenseNotice({ doc: document, storage: window.sessionStorage, navigate });

    document.getElementById('btn-license-reject').click();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(REPO_MAINPAGE_URL);
    expect(window.sessionStorage.getItem(LICENSE_NOTICE_ACK_KEY)).toBeNull();
  });

  it('hides the dialog and unlocks the demo when Accept is clicked', () => {
    const navigate = vi.fn();

    setupLicenseNotice({ doc: document, storage: window.sessionStorage, navigate });

    document.getElementById('btn-license-accept').click();

    const overlay = document.getElementById('license-overlay');
    expect(overlay.classList.contains('license-overlay--hidden')).toBe(true);
    expect(window.sessionStorage.getItem(LICENSE_NOTICE_ACK_KEY)).toBe('true');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('starts hidden on subsequent loads in the same session and allows reopening and closing', () => {
    window.sessionStorage.setItem(LICENSE_NOTICE_ACK_KEY, 'true');

    setupLicenseNotice({ doc: document, storage: window.sessionStorage, navigate: vi.fn() });

    const overlay = document.getElementById('license-overlay');
    const rejectButton = document.getElementById('btn-license-reject');
    const acceptButton = document.getElementById('btn-license-accept');
    const closeButton = document.getElementById('btn-license-close');

    expect(overlay.classList.contains('license-overlay--hidden')).toBe(true);

    document.getElementById('btn-license-notice').click();

    expect(overlay.classList.contains('license-overlay--hidden')).toBe(false);
    expect(rejectButton.hidden).toBe(true);
    expect(closeButton.hidden).toBe(false);
    expect(acceptButton.textContent.trim()).toBe('Close');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(overlay.classList.contains('license-overlay--hidden')).toBe(true);
  });
});
