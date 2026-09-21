import EventBus from 'diagram-js/lib/core/EventBus.js';
import CommandStack from 'diagram-js/lib/command/CommandStack.js';
import UpdateModdlePropertiesHandler from 'bpmn-js/lib/features/modeling/cmd/UpdateModdlePropertiesHandler.js';

export function createAnnotationCommandStack() {
  const eventBus = new EventBus();
  const commandStack = new CommandStack(eventBus, {});
  commandStack.register('element.updateModdleProperties', new UpdateModdlePropertiesHandler({
    filter: () => []
  }));
  return {
    eventBus,
    commandStack,
    modeling: {
      updateModdleProperties(element, moddleElement, properties) {
        commandStack.execute('element.updateModdleProperties', {
          element, moddleElement, properties
        });
      }
    }
  };
}
