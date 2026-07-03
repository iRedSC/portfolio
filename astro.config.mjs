// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';

// Use Node adapter for Nixpacks/Dokploy; Vercel adapter otherwise
const isNixpacks = process.env.NIXPACKS === '1';
const siteUrl =
	process.env.SITE_URL ?? (isNixpacks ? 'https://masonltrout.me' : 'http://localhost:4321');
const { hostname, protocol } = new URL(siteUrl);
const siteProtocol = protocol.replace(':', '');

// https://astro.build/config
export default defineConfig({
	site: siteUrl,
	security: {
		// Protocol and hostname must be separate entries — combined patterns break forwarded-proto validation.
		allowedDomains: [
			{ protocol: siteProtocol },
			{ hostname },
			...(hostname !== 'localhost' && !hostname.startsWith('www.')
				? [{ hostname: `www.${hostname}` }]
				: []),
		],
	},
	output: 'server',
	adapter: isNixpacks ? node({ mode: 'standalone' }) : vercel(),
	server: isNixpacks ? { host: true } : undefined,
	markdown: {
		shikiConfig: {
			theme: 'gruvbox-dark-medium',
		},
	},
	integrations: [
		react(),
		mdx({
			rehypePlugins: [
				rehypeSlug,
				[
					rehypeAutolinkHeadings,
					{
						behavior: 'wrap',
						properties: {
							className: ['heading-link'],
							ariaLabel: 'Section link',
						},
					},
				],
			],
		}),
		sitemap(),
	],
	vite: {
		optimizeDeps: {
			include: ['three'],
		},
	},
});
