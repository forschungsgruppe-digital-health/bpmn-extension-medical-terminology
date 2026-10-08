import { useErrors } from '@bpmn-io/properties-panel';
import { useEffect, useRef } from '@bpmn-io/properties-panel/preact/hooks';

/**
 * Publish entry-owned errors through the properties panel error context.
 *
 * The properties panel event replaces the complete error map. Preserve errors
 * contributed by other entries and restore temporarily displaced host errors.
 */
export function usePropertiesPanelErrors(localErrors, eventBus) {
  const panelErrors = useErrors();
  const panelErrorsRef = useRef(panelErrors);
  const publishedErrorsRef = useRef({});
  const displacedErrorsRef = useRef({});
  const normalizedLocalErrors = normalizeErrors(localErrors);
  const localErrorsSignature = JSON.stringify(normalizedLocalErrors);

  panelErrorsRef.current = panelErrors;

  useEffect(() => {
    if (!eventBus?.on || !eventBus?.off) {
      return;
    }

    const handleSetErrors = ({ errors = {} }) => {
      for (const [id, publishedError] of Object.entries(publishedErrorsRef.current)) {
        if (errors[id] === publishedError) {
          continue;
        }

        if (errors[id]) {
          displacedErrorsRef.current[id] = errors[id];
        } else {
          delete displacedErrorsRef.current[id];
        }
      }

      panelErrorsRef.current = errors;
    };

    eventBus.on('propertiesPanel.setErrors', handleSetErrors);
    return () => eventBus.off('propertiesPanel.setErrors', handleSetErrors);
  }, [eventBus]);

  useEffect(() => {
    if (!eventBus) {
      return;
    }

    const currentErrors = panelErrorsRef.current || {};
    const publishedErrors = publishedErrorsRef.current;
    const displacedErrors = displacedErrorsRef.current;
    const nextErrors = { ...currentErrors };
    let changed = false;

    for (const [id, publishedError] of Object.entries(publishedErrors)) {
      if (normalizedLocalErrors[id]) {
        continue;
      }

      if (currentErrors[id] === publishedError) {
        if (displacedErrors[id]) {
          nextErrors[id] = displacedErrors[id];
        } else {
          delete nextErrors[id];
        }
        changed = true;
      }

      delete publishedErrors[id];
      delete displacedErrors[id];
    }

    for (const [id, localError] of Object.entries(normalizedLocalErrors)) {
      if (!publishedErrors[id] && currentErrors[id] && currentErrors[id] !== localError) {
        displacedErrors[id] = currentErrors[id];
      }

      publishedErrors[id] = localError;

      if (currentErrors[id] !== localError) {
        nextErrors[id] = localError;
        changed = true;
      }
    }

    if (changed) {
      publishErrors(eventBus, panelErrorsRef, nextErrors);
    }
  }, [eventBus, localErrorsSignature]);

  useEffect(() => {
    return () => {
      const currentErrors = panelErrorsRef.current || {};
      const publishedErrors = publishedErrorsRef.current;
      const displacedErrors = displacedErrorsRef.current;
      const nextErrors = { ...currentErrors };
      let changed = false;

      for (const [id, publishedError] of Object.entries(publishedErrors)) {
        if (currentErrors[id] !== publishedError) {
          continue;
        }

        if (displacedErrors[id]) {
          nextErrors[id] = displacedErrors[id];
        } else {
          delete nextErrors[id];
        }
        changed = true;
      }

      if (eventBus && changed) {
        eventBus.fire('propertiesPanel.setErrors', { errors: nextErrors });
      }
    };
  }, [eventBus]);

  const resolvedErrors = { ...panelErrors };

  for (const [id, publishedError] of Object.entries(publishedErrorsRef.current)) {
    if (!normalizedLocalErrors[id] && resolvedErrors[id] === publishedError) {
      delete resolvedErrors[id];
    }
  }

  return {
    ...resolvedErrors,
    ...normalizedLocalErrors
  };
}

function normalizeErrors(errors = {}) {
  return Object.fromEntries(
    Object.entries(errors).filter(([, error]) => Boolean(error))
  );
}

function publishErrors(eventBus, panelErrorsRef, errors) {
  panelErrorsRef.current = errors;
  eventBus.fire('propertiesPanel.setErrors', { errors });
}
