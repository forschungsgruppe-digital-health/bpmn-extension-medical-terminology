export async function createDemoTerminologyServices() {
  const { createDefaultTerminologyServices } = await import('@forschungsgruppe-digital-health/terminology');

  return createDefaultTerminologyServices();
}
