import { defineConfig, loadEnv } from 'vite';
export function createDemoViteConfig(env = {}) {
  return {
    base: env.BASE_PATH || '/',
    resolve: {
      preserveSymlinks: true
    },
    optimizeDeps: {
      force: true
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // Source maps roughly double the published demo. Kept on for local
      // builds, switched off for the Pages build via BUILD_SOURCEMAP=false.
      sourcemap: env.BUILD_SOURCEMAP !== 'false'
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return createDemoViteConfig(env);
});
