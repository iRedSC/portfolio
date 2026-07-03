import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	schema: ({ image }) => z.object({
		title: z.string(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		image: image().optional(),
		heroImage: z.string().optional(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		draft: z.boolean().default(false),
	}),
});

const tldrs = defineCollection({
	type: 'content',
	schema: ({ image }) => z.object({
		title: z.string(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		image: image().optional(),
		heroImage: z.string().optional(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		draft: z.boolean().default(false),
	}),
});

const projects = defineCollection({
	type: 'content',
	schema: ({ image }) => z.object({
		title: z.string(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		image: image().optional(),
		heroImage: z.string().optional(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		draft: z.boolean().default(false),
		githubRepo: z.string(),
		githubMilestoneId: z.number().optional(),
		featured: z.boolean().default(false),
		demoUrl: z.string().url().optional(),
		demoNote: z.string().optional(),
		repoUrl: z.string().url(),
		status: z.enum(['active', 'complete', 'archived']).default('active'),
	}),
});

const caseStudies = defineCollection({
	type: 'content',
	schema: ({ image }) => z.object({
		title: z.string(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		image: image().optional(),
		heroImage: z.string().optional(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		draft: z.boolean().default(false),
		featured: z.boolean().default(false),
	}),
});

export const collections = { blog, tldrs, projects, 'case-studies': caseStudies };