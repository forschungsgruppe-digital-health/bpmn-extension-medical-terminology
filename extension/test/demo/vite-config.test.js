import { createServer as createHttpServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createServer as createViteServer } from 'vite';
import { createDemoViteConfig } from '../../../demo/vite.config.js';
import {
  createSnowstormProxyConfig,
  terminologyVitePlugin
} from '../../src/vite/plugin.js';

function getDemoSnowstormProxy(env) {
  const [plugin] = createDemoViteConfig(env).plugins;

  return plugin.config({}, { command: 'serve' }).server.proxy['/snowstorm-api'];
}

describe('demo Vite configuration', () => {
  it('proxies Snowstorm API requests through the local development route when configured', () => {
    const proxy = getDemoSnowstormProxy({
      VITE_SNOWSTORM_PROXY_TARGET: 'https://snowstorm.example.test/snowstorm/snomed-ct'
    });

    expect(proxy.target).toBe('https://snowstorm.example.test');
    expect(proxy.rewrite('/snowstorm-api/MAIN/concepts?term=alpha'))
      .toBe('/snowstorm/snomed-ct/MAIN/concepts?term=alpha');
  });

  it('does not configure a Vite proxy without an explicit Snowstorm target', () => {
    expect(createDemoViteConfig().plugins).toEqual([]);
  });

  it('uses the configured Snowstorm proxy target base path', () => {
    const proxy = createSnowstormProxyConfig({
      target: 'https://snowstorm.example.test/api/snomed'
    })['/snowstorm-api'];

    expect(proxy.target).toBe('https://snowstorm.example.test');
    expect(proxy.rewrite('/snowstorm-api/MAIN/concepts?term=alpha'))
      .toBe('/api/snomed/MAIN/concepts?term=alpha');
  });

  it('rejects an unsafe Snowstorm proxy target', () => {
    expect(() => createSnowstormProxyConfig({
      target: 'ftp://snowstorm.example.test'
    })).toThrow('Snowstorm Vite proxy target must use http or https.');
  });

  it('registers the Snowstorm proxy only for the Vite development server', () => {
    const plugin = terminologyVitePlugin({
      autoDiscover: false,
      exposeGlobal: false,
      snowstormProxy: {
        target: 'https://snowstorm.example.test/snomed-ct'
      }
    });

    expect(plugin.config({}, { command: 'build' })).toBeUndefined();
    const proxy = plugin.config({}, { command: 'serve' })
      .server.proxy['/snowstorm-api'];

    expect(proxy.target).toBe('https://snowstorm.example.test');
    expect(proxy.rewrite('/snowstorm-api/MAIN/concepts'))
      .toBe('/snomed-ct/MAIN/concepts');
  });

  it('does not validate a development-only proxy target during a Vite build', () => {
    const plugin = terminologyVitePlugin({
      snowstormProxy: {
        target: 'not-a-url'
      }
    });

    expect(plugin.config({}, { command: 'build' })).toBeUndefined();
    expect(() => plugin.config({}, { command: 'serve' })).toThrow();
  });

  it('forwards a local Snowstorm request through the Vite proxy', async () => {
    let receivedUrl;
    const targetServer = createHttpServer((request, response) => {
      receivedUrl = request.url;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ items: [], total: 0 }));
    });

    await new Promise((resolve, reject) => {
      targetServer.once('error', reject);
      targetServer.listen(0, '127.0.0.1', resolve);
    });

    const targetAddress = targetServer.address();
    if (!targetAddress || typeof targetAddress === 'string') {
      throw new Error('Expected a TCP address for the Snowstorm test server.');
    }

    const viteServer = await createViteServer({
      ...createDemoViteConfig({
        VITE_SNOWSTORM_PROXY_TARGET: `http://127.0.0.1:${targetAddress.port}/snowstorm/snomed-ct`
      }),
      configFile: false,
      logLevel: 'error',
      server: {
        host: '127.0.0.1',
        port: 0
      }
    });

    try {
      await viteServer.listen();
      const viteAddress = viteServer.httpServer.address();
      if (!viteAddress || typeof viteAddress === 'string') {
        throw new Error('Expected a TCP address for the Vite test server.');
      }

      const response = await fetch(
        `http://127.0.0.1:${viteAddress.port}/snowstorm-api/MAIN/concepts?term=alpha&limit=5`
      );

      await expect(response.json()).resolves.toEqual({ items: [], total: 0 });
      expect(receivedUrl).toBe('/snowstorm/snomed-ct/MAIN/concepts?term=alpha&limit=5');
    } finally {
      await viteServer.close();
      await new Promise((resolve, reject) => {
        targetServer.close(error => error ? reject(error) : resolve());
      });
    }
  });
});
