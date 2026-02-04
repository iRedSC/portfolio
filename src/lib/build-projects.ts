import { getCollection } from 'astro:content';
import { getMilestoneProgress, fetchRepositoryInfo } from './github';

export interface EnrichedProject {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  heroImage?: string;
  tags: string[];
  draft: boolean;
  featured: boolean;
  progress?: number;
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
      const [progress, repoInfo] = await Promise.all([
        getMilestoneProgress(
          project.data.githubRepo,
          project.data.githubMilestoneId,
        ),
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
        tags,
        draft: project.data.draft,
        featured: project.data.featured ?? false,
        progress: progress.percent,
        language,
      };
    }),
  );

  return enriched.filter((p) => !p.draft);
}
