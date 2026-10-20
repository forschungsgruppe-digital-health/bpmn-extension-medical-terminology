import { html } from 'htm/preact';
import { useEffect, useState } from '@bpmn-io/properties-panel/preact/hooks';
import { CheckboxEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

export const SHOW_AS_COMMENT_ENTRY_ID = 'medical-terminology-show-as-comment';

/**
 * Global checkbox that shows the codings of all annotated shapes as a comment
 * block on the diagram. Renders nothing when the optional diagram module is not
 * installed.
 */
export function ShowAsCommentEntry(props) {
  const { element, id = SHOW_AS_COMMENT_ENTRY_ID } = props;
  const translate = useService('translate');
  const eventBus = useService('eventBus', false);
  const visibility = useService('terminologyCommentVisibility', false);
  const [ , setRefresh ] = useState(0);

  useEffect(() => {
    if (!eventBus) {
      return undefined;
    }
    const refresh = () => setRefresh((value) => value + 1);
    eventBus.on('terminology.comments.changed', refresh);
    return () => eventBus.off('terminology.comments.changed', refresh);
  }, [ eventBus ]);

  if (!visibility) {
    return null;
  }

  return html`<${CheckboxEntry}
    id=${id}
    element=${element}
    label=${translate('Show as comment')}
    description=${translate('Lists the codings of all annotated elements next to them in the diagram.')}
    getValue=${() => visibility.isVisible()}
    setValue=${(value) => visibility.setVisible(value)}
  />`;
}
