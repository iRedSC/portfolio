import { getCollection } from 'astro:content';
import type { CommitDay } from './commit-heatmap';
import { getCommitActivity, fetchRepositoryInfo } from './github';

export interface EnrichedProject {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  heroImage?: string;
  thumbnail?: string;
  tags: string[];
  draft: boolean;
  featured: boolean;
  commitActivity?: CommitDay[];
  language?: string;
}

const TAG_TO_LANGUAGE: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  ruby: 'Ruby',
  php: 'PHP',
  csharp: 'C#',
  astro: 'TypeScript',
  react: 'JavaScript',
  vue: 'JavaScript',
  svelte: 'TypeScript',
};

function getFallbackLanguage(tags: string[], slug: string): string {
  const lower = tags.map((t) => t.toLowerCase());
  for (const tag of lower) {
    if (TAG_TO_LANGUAGE[tag]) return TAG_TO_LANGUAGE[tag];
  }
  return 'TypeScript';
}

export async function getEnrichedProjects(): Promise<EnrichedProject[]> {
  const projects = await getCollection('projects');

  const enriched = await Promise.all(
    projects.map(async (project) => {
      const tags = project.data.tags ?? [];
      const [commitActivity, repoInfo] = await Promise.all([
        getCommitActivity(project.data.githubRepo),
        (() => {
          const repoUrl = project.data.repoUrl;
          const match = repoUrl?.match(/github\.com\/([^/]+)\/([^/]+)/);
          if (!match) return null;
          const [, owner, repo] = match;
          return fetchRepositoryInfo(owner, repo);
        })(),
      ]);

      const language =
        (repoInfo?.language ?? undefined) || getFallbackLanguage(tags, project.slug);

      return {
        slug: project.slug,
        title: project.data.title,
        description: project.data.description,
        pubDate: project.data.pubDate,
        updatedDate: project.data.updatedDate,
        heroImage: project.data.heroImage,
        thumbnail: project.data.thumbnail?.src,
        tags,
        draft: project.data.draft,
        featured: project.data.featured ?? false,
        commitActivity: commitActivity.days,
        language,
      };
    }),
  );

  return enriched.filter((p) => !p.draft);
}
