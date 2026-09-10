import { describe, expect, it } from 'vitest';
import { createDemoViteConfig } from '../../../demo/vite.config.js';

describe('demo Vite configuration', () => {
  it('does not configure a terminology or Snowstorm proxy', () => {
    const config = createDemoViteConfig();

    expect(config.plugins).toBeUndefined();
    expect(config.server?.proxy).toBeUndefined();
  });
});
