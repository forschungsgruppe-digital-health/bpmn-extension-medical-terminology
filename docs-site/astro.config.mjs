// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTypeDoc from 'starlight-typedoc';
import { readFileSync } from 'node:fs';

// Built by scripts/build-api-sidebar.mjs from the @category tags on the entry
// point. starlight-typedoc's own sidebar group is organised by declaration kind
// — classes, functions, interfaces — which says what a symbol is rather than
// what it is for, so the generated one replaces it.
const apiSidebar = JSON.parse(readFileSync(new URL('./src/generated/api-sidebar.json', import.meta.url), 'utf8'));


const SITE_BASE = '/bpmn-extension-medical-terminology';

/**
 * Prefix root-relative links written in Markdown with the site base.
 *
 * Astro rewrites links it generates, but not the ones you write yourself, so
 * `[schema](/schema/)` in a page would resolve to the domain root and 404 with
 * no build error. Rewriting them here keeps the content base-agnostic: pages
 * are written as if the site were at the root, which is also how they read on
 * GitHub.
 */
function rehypeBaseLinks() {
  return tree => {
    const visit = node => {
      if (node.type === 'element' && node.properties) {
        for (const attribute of ['href', 'src']) {
          const value = node.properties[attribute];
          if (
            typeof value === 'string' &&
            value.startsWith('/') &&
            !value.startsWith('//') &&
            value !== SITE_BASE &&
            !value.startsWith(`${SITE_BASE}/`)
          ) {
            node.properties[attribute] = SITE_BASE + value;
          }
        }
      }
      for (const child of node.children || []) visit(child);
    };
    visit(tree);
  };
}

const REPO = 'https://github.com/forschungsgruppe-digital-health/bpmn-extension-medical-terminology';

export default defineConfig({
  // The site is published under the repository path on GitHub Pages, with the
  // interactive demo mounted alongside it at /demo/. Both values are needed:
  // `site` builds absolute URLs for the sitemap and Open Graph tags, `base`
  // prefixes every internal link and asset.
  site: 'https://forschungsgruppe-digital-health.github.io',
  base: SITE_BASE,
  trailingSlash: 'always',

  markdown: {
    rehypePlugins: [rehypeBaseLinks]
  },

  integrations: [
    starlight({
      title: 'BPMN Medical Terminology',
      favicon: '/favicon.svg',
      description:
        'Bind coded concepts from clinical code systems to BPMN elements, in the BPMN file itself.',
      lastUpdated: true,
      editLink: { baseUrl: `${REPO}/edit/main/docs-site/` },
      social: [{ icon: 'github', label: 'GitHub', href: REPO }],
      customCss: ['./src/styles/custom.css'],

      plugins: [
        starlightTypeDoc({
          entryPoints: ['../extension/src/index.js'],
          tsconfig: '../tsconfig.docs.json',
          output: 'api',
          typeDoc: {
            plugin: ['typedoc-plugin-markdown'],
            excludeInternal: true,
            excludePrivate: true,
            exclude: ['**/moddle/clinical.json'],
            readme: 'none',
            useCodeBlocks: true,
            expandObjects: true,
            parametersFormat: 'table',
            skipErrorChecking: true,
            categorizeByGroup: false,
            // TypeDoc ignores @category on a JSDoc @typedef alias, so the shared data
            // shapes fall through to the default bucket. Name it for what it holds.
            defaultCategory: 'Core types',
            categoryOrder: [
              'Getting started',
              'Configuration',
              'Providers',
              'Extensibility',
              'Annotations',
              'Properties panel',
              'Core types',
              'XML schema',
              'Discovery',
              'Internal helpers'
            ]
          }
        })
      ],

      sidebar: [
        { label: 'Start here', items: [
          { label: 'Overview', link: '/' },
          { label: 'Use cases', link: '/use-cases/' }
        ] },
        { label: 'Using the extension', items: [
          { label: 'Configuration', link: '/configuration/' },
          { label: 'Default configuration', link: '/configuration/defaults/' },
          { label: 'Terminology packages', link: '/configuration/discovery/' },
          { label: 'Properties panel', link: '/properties-panel/' }
        ] },
        { label: 'The data format', items: [
          { label: 'XML schema', link: '/schema/' },
          { label: 'Compatibility', link: '/compatibility/' }
        ] },
        { label: 'Extending it', items: [
          { label: 'Extension points', link: '/extending/' },
          { label: 'Writing a provider', link: '/extending/providers/' },
          { label: 'Transport adapters', link: '/extending/adapters/' }
        ] },
        ...apiSidebar,
        { label: 'Architecture', collapsed: true, items: [{ autogenerate: { directory: 'architecture' } }] },
        { label: 'Project', items: [
          { label: 'Background and related work', link: '/background/' },
          { label: 'Roadmap', link: '/roadmap/' },
          { label: 'Contributing', link: '/contributing/' },
          { label: 'Support', link: '/support/' }
        ] }
      ]
    })
  ]
});
