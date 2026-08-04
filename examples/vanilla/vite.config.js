import { defineConfig } from 'vite';
import { terminologyVitePlugin } from '@forschungsgruppe-digital-health/terminology/vite';
import {
  DISCOVERY_PACKAGES,
  ENABLE_PACKAGE_DISCOVERY
} from './src/terminology-config.js';

export default defineConfig({
  base: '/bpmn-js-clinical-semantics/',
  resolve: {
    preserveSymlinks: true
  },
  plugins: [
    terminologyVitePlugin({
      packages: ENABLE_PACKAGE_DISCOVERY ? DISCOVERY_PACKAGES : [],
      autoDiscover: ENABLE_PACKAGE_DISCOVERY,
      exposeGlobal: true
    })
  ],
  build: {
    outDir: '../../site',
    emptyOutDir: true,
    sourcemap: true
  }
});
