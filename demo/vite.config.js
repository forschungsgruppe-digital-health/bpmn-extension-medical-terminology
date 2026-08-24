import { defineConfig } from 'vite';
import { terminologyVitePlugin } from '@forschungsgruppe-digital-health/terminology/vite';
import {
  ENABLE_PACKAGE_DISCOVERY,
  DISCOVERY_PACKAGES
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
  optimizeDeps: {
    force: true
  },
  plugins: [
    terminologyVitePlugin({
      packages: ENABLE_PACKAGE_DISCOVERY ? DISCOVERY_PACKAGES : []
    })
  ],
  build: {
    outDir: '../site',
    emptyOutDir: true,
    sourcemap: true
  }
});
