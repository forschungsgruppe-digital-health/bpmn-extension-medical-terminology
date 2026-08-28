declare module 'virtual:fdh-terminology-packages' {
  const packages: Record<string, import('fhir/r4').CodeSystem[]>;
  export const packageMetadata: Record<string, {
    packageName?: string;
    title?: string;
    version?: string;
  }>;
  export default packages;
}
