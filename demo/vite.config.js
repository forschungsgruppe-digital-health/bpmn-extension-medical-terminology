import { defineConfig, loadEnv } from 'vite';
import {
  terminologyVitePlugin
} from '@forschungsgruppe-digital-health/bpmn-extension-medical-terminology/vite';

export function createDemoViteConfig(env = {}) {
  const snowstormProxyTarget = env.VITE_SNOWSTORM_PROXY_TARGET?.trim();

  return {
    base: env.BASE_PATH || '/',
    plugins: snowstormProxyTarget
      ? [terminologyVitePlugin({
        autoDiscover: false,
        exposeGlobal: false,
        snowstormProxy: {
          target: snowstormProxyTarget
        }
      })]
      : [],
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
