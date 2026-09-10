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
      sourcemap: true
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return createDemoViteConfig(env);
});
