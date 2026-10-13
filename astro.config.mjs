// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import node from "@astrojs/node";

import react from "@astrojs/react";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  // Canonical origin for metadata and sitemaps. Set SITE_URL to the deployed domain.
  site: process.env.SITE_URL || 'https://s4meer.com',
  // Start loading a page when its link is hovered or focused, so client-side
  // navigation usually finds the page already fetched.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    mdx(),
    {
      name: 'isolated-vite-cache',
      hooks: {
        'astro:config:setup': ({ command, updateConfig }) => {
          // A build must not replace the dependency files used by a running dev
          // server; that leaves React islands requesting obsolete module hashes.
          updateConfig({ vite: { cacheDir: `./node_modules/.vite-${command}` } });
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Needed for temporary HTTPS tunnels used to preview the local site on a phone.
      allowedHosts: ["quiet-pants-prove.loca.lt"],
    },
  },
});
