export async function createDemoTerminologyServices() {
  const { createDefaultTerminologyServices } = await import('@forschungsgruppe-digital-health/bpmn-extension-medical-terminology');

  return createDefaultTerminologyServices();
}
