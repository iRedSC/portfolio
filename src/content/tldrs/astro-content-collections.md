---
title: "Astro Content Collections: Type-Safe Content Management"
description: "Quick overview of Astro's content collections feature for managing blog posts, projects, and other structured content with TypeScript support."
pubDate: 2024-02-01
tags: ["astro", "typescript", "content-management", "cms"]
draft: false
---

# Astro Content Collections TLDR

## What Are They?
Content collections provide type-safe content management in Astro, allowing you to define schemas for different content types using Zod validation.

## Key Benefits
- **Type Safety**: Full TypeScript support with autocompletion
- **Validation**: Automatic validation of frontmatter and content structure
- **Querying**: Efficient content querying and filtering
- **Performance**: Optimized build-time content processing

## Basic Setup

### 1. Define Schema (`src/content/config.ts`)
```typescript
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()),
  }),
});

export const collections = {
  blog: blogCollection,
};
```

### 2. Configure Astro (`astro.config.mjs`)
```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Content collections are enabled by default in Astro 3.0+
});
```

### 3. Create Content (`src/content/blog/`)
```markdown
---
title: "My Blog Post"
description: "A description of my post"
pubDate: 2024-02-01
tags: ["tag1", "tag2"]
---

# My Content

Content goes here...
```

### 4. Query Content in Pages
```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
---

<ul>
  {posts.map(post => (
    <li>{post.data.title}</li>
  ))}
</ul>
```

## Content Types
- **`content`**: Markdown/MDX files with frontmatter
- **`data`**: JSON/YAML files without body content

## Best Practices
- Use descriptive collection names
- Keep schemas simple but comprehensive
- Leverage TypeScript for better DX
- Use consistent naming conventions
- Validate content during development

## File Structure
```
src/content/
├── config.ts          # Collection definitions
├── blog/             # Blog collection
│   ├── post-1.md
│   └── post-2.md
└── projects/         # Projects collection
    ├── project-1.md
    └── project-2.md
```

## Common Patterns
- **Blog Posts**: title, description, date, tags, draft status
- **Projects**: title, description, links, technologies, status
- **Team Members**: name, role, bio, social links
- **Products**: name, description, pricing, features

## Migration from Other CMS
Content collections make it easy to migrate from traditional CMS platforms by providing a file-based approach with the same structured data benefits.

**Pro Tip**: Use `astro check` to validate your content collections and catch schema errors early in development.