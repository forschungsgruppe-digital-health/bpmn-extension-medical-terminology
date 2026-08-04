declare module 'virtual:fdh-terminology-packages' {
  const packages: Record<string, import('fhir/r4').CodeSystem[]>;
  export default packages;
}
