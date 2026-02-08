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

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL ?? 'http://localhost:4321',
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
