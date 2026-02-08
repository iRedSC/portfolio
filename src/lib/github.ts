import fs from 'node:fs/promises';
import path from 'node:path';
import { Octokit } from 'octokit';

type MilestoneProgress = {
	percent: number;
	open: number;
	closed: number;
	total: number;
	updatedAt: string;
};

const cacheDir = path.join(process.cwd(), '.cache');
const cacheFile = path.join(cacheDir, 'github.json');

async function readCache(): Promise<Record<string, MilestoneProgress>> {
	try {
		const raw = await fs.readFile(cacheFile, 'utf-8');
		return JSON.parse(raw) as Record<string, MilestoneProgress>;
	} catch {
		return {};
	}
}

async function writeCache(cache: Record<string, MilestoneProgress>) {
	try {
		await fs.mkdir(cacheDir, { recursive: true });
		await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
	} catch {
		// ignore cache write failures
	}
}

export async function getMilestoneProgress(
	repoSlug: string,
	milestoneId: number,
): Promise<MilestoneProgress> {
	const cacheKey = `${repoSlug}#${milestoneId}`;
	const cache = await readCache();
	const cached = cache[cacheKey];
	const isDev = process.env.NODE_ENV === 'development';
	const token = process.env.GITHUB_TOKEN;

	if (isDev && cached) {
		return cached;
	}

	if (!token) {
		if (cached) return cached;
		return { percent: 0, open: 0, closed: 0, total: 0, updatedAt: new Date().toISOString() };
	}

	try {
		const [owner, repo] = repoSlug.split('/');
		const octokit = new Octokit({ auth: token });
		const { data } = await octokit.rest.issues.getMilestone({
			owner,
			repo,
			milestone_number: milestoneId,
		});
		const open = data.open_issues ?? 0;
		const closed = data.closed_issues ?? 0;
		const total = open + closed;
		const percent = total === 0 ? 0 : Math.round((closed / total) * 100);
		const progress = {
			percent,
			open,
			closed,
			total,
			updatedAt: new Date().toISOString(),
		};
		cache[cacheKey] = progress;
		await writeCache(cache);
		return progress;
	} catch (error) {
		console.warn(`Milestone fetch failed for ${repoSlug}#${milestoneId}`);
		if (cached) return cached;
		return { percent: 0, open: 0, closed: 0, total: 0, updatedAt: new Date().toISOString() };
	}
}

interface Milestone {
  title: string;
  description?: string;
  due_on?: string;
  state: 'open' | 'closed';
  number: number;
  open_issues: number;
  closed_issues: number;
}

interface ProjectProgress {
  projectId: string;
  totalIssues: number;
  completedIssues: number;
  progressPercentage: number;
  milestones: Milestone[];
}

let octokit: Octokit | null = null;

function initializeOctokit(): Octokit | null {
  if (octokit === null) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn('GITHUB_TOKEN environment variable not found. GitHub integration features will be disabled.');
      return null;
    }
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

export async function fetchProjectProgress(owner: string, repo: string, projectId: string): Promise<ProjectProgress> {
  const octokit = initializeOctokit();

  // Return default progress if GitHub integration is not available
  if (!octokit) {
    console.info(`GitHub integration disabled - returning default progress for project ${projectId}`);
    return {
      projectId,
      totalIssues: 0,
      completedIssues: 0,
      progressPercentage: 0,
      milestones: [],
    };
  }

  try {
    // Fetch all milestones for the repository
    const { data: milestones } = await octokit.rest.issues.listMilestones({
      owner,
      repo,
      state: 'all',
    });

    // Filter milestones that contain the project ID in title or description
    const projectMilestones = milestones.filter(milestone =>
      milestone.title.includes(projectId) ||
      (milestone.description && milestone.description.includes(projectId))
    );

    // Calculate progress based on milestone completion
    let totalIssues = 0;
    let completedIssues = 0;

    for (const milestone of projectMilestones) {
      totalIssues += milestone.open_issues + milestone.closed_issues;
      completedIssues += milestone.closed_issues;
    }

    const progressPercentage = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0;

    return {
      projectId,
      totalIssues,
      completedIssues,
      progressPercentage: Math.round(progressPercentage),
      milestones: projectMilestones,
    };
  } catch (error) {
    console.warn(`Error fetching progress for project ${projectId}:`, error.message);
    return {
      projectId,
      totalIssues: 0,
      completedIssues: 0,
      progressPercentage: 0,
      milestones: [],
    };
  }
}

export async function fetchRepositoryInfo(owner: string, repo: string) {
  const octokit = initializeOctokit();

  // Return null if GitHub integration is not available
  if (!octokit) {
    console.info(`GitHub integration disabled - skipping repository info for ${owner}/${repo}`);
    return null;
  }

  try {
    const { data } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    return {
      name: data.name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      updatedAt: data.updated_at,
      url: data.html_url,
    };
  } catch (error) {
    console.warn(`Error fetching repository info for ${owner}/${repo}:`, error.message);
    return null;
  }
}