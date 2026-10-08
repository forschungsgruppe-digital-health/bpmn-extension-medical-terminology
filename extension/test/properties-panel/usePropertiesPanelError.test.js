// @vitest-environment jsdom

import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@bpmn-io/properties-panel/preact/hooks', async () => {
  return import('preact/hooks');
});

vi.mock('@bpmn-io/properties-panel', async () => {
  const { createContext } = await import('preact');
  const { useContext } = await import('preact/hooks');
  const ErrorsContext = createContext({ errors: {} });

  return {
    ErrorsContext,
    useError(id) {
      return useContext(ErrorsContext).errors[id];
    },
    useErrors() {
      return useContext(ErrorsContext).errors;
    }
  };
});

const { ErrorsContext } = await import('@bpmn-io/properties-panel');
const { MEDICAL_TERMINOLOGY_ENTRY_ID } = await import('../../src/properties-panel/error-contract.js');
const { usePropertiesPanelErrors } = await import('../../src/properties-panel/usePropertiesPanelError.js');

const containers = [];

describe('properties panel error integration', () => {
  afterEach(() => {
    for (const container of containers.splice(0)) {
      act(() => render(null, container));
      container.remove();
    }
  });

  it('publishes an entry error while preserving errors owned by other entries', async () => {
    const eventBus = createEventBus();
    const container = createContainer();
    const errors = {
      name: 'Synthetic existing panel error.'
    };

    await renderHarness(container, { errors, eventBus, localError: 'Synthetic terminology error.' });

    expect(eventBus.fire).toHaveBeenCalledWith('propertiesPanel.setErrors', {
      errors: {
        name: 'Synthetic existing panel error.',
        [MEDICAL_TERMINOLOGY_ENTRY_ID]: 'Synthetic terminology error.'
      }
    });
    expect(container.textContent).toBe('Synthetic terminology error.');
  });

  it('removes only its own published error after recovery', async () => {
    const eventBus = createEventBus();
    const container = createContainer();
    const publishedErrors = {
      name: 'Synthetic existing panel error.',
      [MEDICAL_TERMINOLOGY_ENTRY_ID]: 'Synthetic terminology error.'
    };

    await renderHarness(container, {
      errors: publishedErrors,
      eventBus,
      localError: 'Synthetic terminology error.'
    });
    eventBus.fire.mockClear();

    await renderHarness(container, { errors: publishedErrors, eventBus, localError: '' });

    expect(eventBus.fire).toHaveBeenCalledWith('propertiesPanel.setErrors', {
      errors: {
        name: 'Synthetic existing panel error.'
      }
    });
    expect(container.textContent).toBe('');
  });

  it('renders an error supplied by the host for the terminology entry', async () => {
    const eventBus = createEventBus();
    const container = createContainer();

    await renderHarness(container, {
      errors: {
        [MEDICAL_TERMINOLOGY_ENTRY_ID]: 'Synthetic host validation error.'
      },
      eventBus,
      localError: ''
    });

    expect(container.textContent).toBe('Synthetic host validation error.');
    expect(eventBus.fire).not.toHaveBeenCalled();
  });

  it('restores a host error after a temporary local error is cleared', async () => {
    const eventBus = createEventBus();
    const container = createContainer();
    const hostErrors = {
      [MEDICAL_TERMINOLOGY_ENTRY_ID]: 'Synthetic host validation error.'
    };

    await renderHarness(container, {
      errors: hostErrors,
      eventBus,
      localError: 'Synthetic terminology error.'
    });

    const publishedErrors = {
      [MEDICAL_TERMINOLOGY_ENTRY_ID]: 'Synthetic terminology error.'
    };
    await renderHarness(container, {
      errors: publishedErrors,
      eventBus,
      localError: 'Synthetic terminology error.'
    });
    eventBus.fire.mockClear();

    await renderHarness(container, { errors: publishedErrors, eventBus, localError: '' });

    expect(eventBus.fire).toHaveBeenCalledWith('propertiesPanel.setErrors', {
      errors: hostErrors
    });
  });
});

function ErrorHarness({ errors, eventBus, localError }) {
  return h(ErrorsContext.Provider, { value: { errors } },
    h(TestEntry, { eventBus, localError })
  );
}

function TestEntry({ eventBus, localError }) {
  const errors = usePropertiesPanelErrors({
    [MEDICAL_TERMINOLOGY_ENTRY_ID]: localError
  }, eventBus);

  return h('div', null, errors[MEDICAL_TERMINOLOGY_ENTRY_ID] || '');
}

async function renderHarness(container, props) {
  await act(async () => {
    render(h(ErrorHarness, props), container);
  });
}

function createEventBus() {
  return {
    fire: vi.fn()
  };
}

function createContainer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  return container;
}
