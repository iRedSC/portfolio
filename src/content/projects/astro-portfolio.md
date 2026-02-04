---
title: "Astro Portfolio Website"
description: "A modern, high-performance portfolio website built with Astro, featuring content collections, React islands, and GitHub integration for project tracking."
pubDate: 2024-01-15
updatedDate: 2024-02-03
heroImage: "/images/portfolio-hero.jpg"
tags: ["astro", "react", "typescript", "tailwind", "portfolio"]
draft: false
githubRepo: "yourname/astro-portfolio"
githubMilestoneId: 1
featured: true
demoUrl: "https://example.com"
repoUrl: "https://github.com/yourname/astro-portfolio"
status: "active"
---

# Astro Portfolio Website

A comprehensive portfolio website showcasing modern web development practices with Astro's island architecture, content collections, and seamless integration with GitHub for project progress tracking.

## Features

### 🚀 Performance First
- **Zero JavaScript by default** - Astro's island architecture
- **Static generation** - Fast loading times and optimal SEO
- **Lazy loading** - Components hydrate only when needed

### 📝 Content Management
- **Content Collections** - Type-safe content with Zod validation
- **Multiple content types** - Blog posts, projects, and TLDRs
- **Markdown support** - Rich content with frontmatter

### ⚛️ Interactive Components
- **React Islands** - Selective hydration for interactive elements
- **Client-side filtering** - Dynamic blog post filtering
- **Contact forms** - Serverless form handling

### 🔗 Integrations
- **GitHub Integration** - Real-time project progress tracking
- **Email Service** - Contact form with Resend/SendGrid
- **SEO Optimized** - Meta tags and structured data

## Technical Stack

### Frontend
- **Astro** - Modern web framework with island architecture
- **React** - Component library for interactive islands
- **TypeScript** - Type safety throughout the application
- **CSS Variables** - Custom design system

### Backend & APIs
- **Vercel Serverless** - API routes for contact forms
- **Octokit** - GitHub API integration
- **Content Collections** - File-based CMS

### Development Tools
- **Bun** - Fast JavaScript runtime and package manager
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   └── islands/        # Interactive React components
├── content/            # Content collections
│   ├── blog/           # Blog posts
│   ├── projects/       # Project showcases
│   └── tldrs/          # Quick summaries
├── lib/                # Utility functions
│   ├── github.ts       # GitHub integration
│   ├── skill-paths.ts  # Skill tree loading
│   └── build-projects.ts # Project enrichment
└── pages/              # Route pages
    ├── api/            # Serverless functions
    └── [content-type]/ # Dynamic routes
```

## Key Components

### Skill Path Visualization
Interactive skill trees showing progression through different technologies and frameworks.

```typescript
interface SkillNode {
  id: string;
  name: string;
  level: number;        // 1-5 scale
  dependencies?: string[];
  description?: string;
}
```

### Project Cards with Progress
Dynamic project cards that display GitHub milestone progress and repository statistics.

### Blog Filtering System
Client-side filtering and search for blog posts with tag-based categorization.

## Development Journey

### Phase 1: Foundation
- Set up Astro project with React integration
- Configure TypeScript and content collections
- Create basic layout components

### Phase 2: Data Layer
- Implement content collection schemas
- Create data loaders for skills and accomplishments
- Set up GitHub API integration

### Phase 3: UI Components
- Build reusable component library
- Create layout templates for different content types
- Implement responsive design system

### Phase 4: Interactive Features
- Add React islands for client-side interactivity
- Implement blog filtering and search
- Create contact form with validation

### Phase 5: Content & Deployment
- Add example content for all collections
- Configure environment variables
- Deploy to Vercel with CI/CD

## Performance Optimizations

- **Static Generation**: All pages pre-rendered at build time
- **Image Optimization**: Automatic image optimization and lazy loading
- **Bundle Splitting**: Code splitting for optimal loading
- **Caching Strategy**: Efficient caching of API responses

## Future Enhancements

- [ ] Add dark/light theme toggle
- [ ] Implement search functionality across all content
- [ ] Add analytics and performance monitoring
- [ ] Create admin panel for content management
- [ ] Add internationalization support

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/astro-portfolio.git
cd astro-portfolio

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## Deployment

The project is configured for deployment on Vercel with zero-config setup. Simply connect your repository and deploy.

### Environment Variables Required

```env
# GitHub Integration
GITHUB_TOKEN=your_github_personal_access_token

# Email Service (choose one)
RESEND_API_KEY=your_resend_api_key
# OR
SENDGRID_API_KEY=your_sendgrid_api_key
```

## Contributing

This project serves as a template for modern portfolio websites. Feel free to fork and customize it for your own use. Contributions and feedback are welcome!

## License

MIT License - feel free to use this project as a starting point for your own portfolio.