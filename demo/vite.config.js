import { defineConfig } from 'vite';

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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
});
