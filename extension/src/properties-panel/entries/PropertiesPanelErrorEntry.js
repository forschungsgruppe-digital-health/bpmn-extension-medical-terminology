import { html } from 'htm/preact';
import { useError } from '@bpmn-io/properties-panel';

/**
 * Error-aware wrapper for custom controls that cannot use one of the standard
 * properties-panel field entries.
 */
export function PropertiesPanelErrorEntry({
  children,
  className = '',
  id,
  localError,
  suppressError
}) {
  const globalError = useError(id);
  const error = globalError && globalError !== suppressError
    ? globalError
    : localError;

  if (!children && !error) {
    return null;
  }

  return html`
    <div
      class=${`${className} bio-properties-panel-entry ${error ? 'has-error' : ''}`.trim()}
      data-entry-id=${id}
    >
      ${children}
      ${error && html`<div class="bio-properties-panel-error">${error}</div>`}
    </div>
  `;
}
