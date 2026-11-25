import { html } from 'htm/preact';
import { useEffect, useState } from '@bpmn-io/properties-panel/preact/hooks';
import { ToggleSwitchEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

export const SHOW_BADGES_ENTRY_ID = 'medical-terminology-show-badges';

/**
 * Global switch that shows or hides `MT` badges on annotated BPMN elements
 * and generated comments. Renders nothing when the optional diagram module
 * is not installed.
 */
export function ShowBadgesEntry(props) {
  const { element, id = SHOW_BADGES_ENTRY_ID } = props;
  const translate = useService('translate');
  const eventBus = useService('eventBus', false);
  const badgeRenderer = useService('terminologyBadgeRenderer', false);
  const [ , setRefresh ] = useState(0);

  useEffect(() => {
    if (!eventBus) {
      return undefined;
    }
    const refresh = () => setRefresh((value) => value + 1);
    eventBus.on('terminology.badges.changed', refresh);
    return () => eventBus.off('terminology.badges.changed', refresh);
  }, [ eventBus ]);

  if (!badgeRenderer) {
    return null;
  }

  return html`<${ToggleSwitchEntry}
    id=${id}
    element=${element}
    label=${translate('Show MT badges')}
    inline=${true}
    getValue=${() => badgeRenderer.isVisible()}
    setValue=${(value) => badgeRenderer.setVisible(value)}
  />`;
}
