import { defineConfig } from 'vite';
import { terminologyVitePlugin } from '@forschungsgruppe-digital-health/terminology/vite';
import {
  DISCOVERY_PACKAGES,
  ENABLE_PACKAGE_DISCOVERY
} from './src/terminology-config.js';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: {
    proxy: {
      '/snowstorm-api': {
        target: 'https://snowstorm.snomedtools.org',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/snowstorm-api/, '/snowstorm/snomed-ct')
      }
    }
  },
  resolve: {
    preserveSymlinks: true
  },
  plugins: [
    ENABLE_PACKAGE_DISCOVERY
      ? terminologyVitePlugin({
        packages: DISCOVERY_PACKAGES,
        autoDiscover: true,
        exposeGlobal: true
      })
      : null
  ].filter(Boolean),
  build: {
    outDir: '../site',
    emptyOutDir: true,
    sourcemap: true
  }
});
