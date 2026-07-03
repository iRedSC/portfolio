import fs from 'node:fs/promises';
import path from 'node:path';
import { Octokit } from 'octokit';
import { COMMIT_HEATMAP_DAYS, type CommitDay } from './commit-heatmap';

type MilestoneProgress = {
	percent: number;
	open: number;
	closed: number;
	total: number;
	updatedAt: string;
};

export type CommitActivity = {
	days: CommitDay[];
	updatedAt: string;
};

type GithubCache = Record<string, MilestoneProgress | CommitActivity>;

const cacheDir = path.join(process.cwd(), '.cache');
const cacheFile = path.join(cacheDir, 'github.json');
const COMMIT_ACTIVITY_TTL_MS = 60 * 60 * 1000;
const COMMIT_FETCH_TIMEOUT_MS = 4000;

async function readCache(): Promise<GithubCache> {
	try {
		const raw = await fs.readFile(cacheFile, 'utf-8');
		return JSON.parse(raw) as GithubCache;
	} catch {
		return {};
	}
}

async function writeCache(cache: GithubCache) {
	try {
		await fs.mkdir(cacheDir, { recursive: true });
		await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
	} catch {
		// ignore cache write failures
	}
}

function isMilestoneProgress(entry: MilestoneProgress | CommitActivity | undefined): entry is MilestoneProgress {
	return Boolean(entry && 'percent' in entry);
}

function isCommitActivity(entry: MilestoneProgress | CommitActivity | undefined): entry is CommitActivity {
	return Boolean(entry && 'days' in entry);
}

function commitActivityAgeMs(entry: CommitActivity): number {
	return Date.now() - new Date(entry.updatedAt).getTime();
}

function isFreshCommitActivity(entry: CommitActivity): boolean {
	return commitActivityAgeMs(entry) < COMMIT_ACTIVITY_TTL_MS;
}

function emptyCommitActivity(): CommitActivity {
	const days: CommitDay[] = [];
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (let i = COMMIT_HEATMAP_DAYS - 1; i >= 0; i -= 1) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		days.push({
			date: date.toISOString().slice(0, 10),
			count: 0,
		});
	}

	return { days, updatedAt: new Date().toISOString() };
}

function dailyCountsFromCommitActivity(
	weeklyData: Array<{ week: number; days: number[] }>,
): CommitDay[] {
	const countsByDate = new Map<string, number>();

	for (const week of weeklyData) {
		const weekStart = new Date(week.week * 1000);
		for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
			const date = new Date(weekStart);
			date.setUTCDate(date.getUTCDate() + dayIndex);
			const dateKey = date.toISOString().slice(0, 10);
			countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + (week.days[dayIndex] ?? 0));
		}
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const days: CommitDay[] = [];

	for (let i = COMMIT_HEATMAP_DAYS - 1; i >= 0; i -= 1) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		const dateKey = date.toISOString().slice(0, 10);
		days.push({
			date: dateKey,
			count: countsByDate.get(dateKey) ?? 0,
		});
	}

	return days;
}

async function fetchDailyCommitActivity(
	octokit: Octokit,
	owner: string,
	repo: string,
): Promise<CommitDay[]> {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const response = await octokit.request('GET /repos/{owner}/{repo}/stats/commit_activity', {
			owner,
			repo,
		});

		if (response.status === 202) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			continue;
		}

		if (response.status !== 200 || !Array.isArray(response.data)) {
			break;
		}

		return dailyCountsFromCommitActivity(response.data);
	}

	return [];
}

export async function getCommitActivity(repoSlug: string): Promise<CommitActivity> {
	const cacheKey = `commits30d:${repoSlug}`;
	const cache = await readCache();
	const cached = isCommitActivity(cache[cacheKey]) ? cache[cacheKey] : undefined;
	const token = process.env.GITHUB_TOKEN;

	if (cached && (!token || isFreshCommitActivity(cached))) {
		return cached;
	}

	if (!token) {
		return cached ?? emptyCommitActivity();
	}

	try {
		const [owner, repo] = repoSlug.split('/');
		const octokit = new Octokit({ auth: token });
		const days = await Promise.race([
			fetchDailyCommitActivity(octokit, owner, repo),
			new Promise<CommitDay[]>((_, reject) => {
				setTimeout(() => reject(new Error('Commit activity fetch timed out')), COMMIT_FETCH_TIMEOUT_MS);
			}),
		]);
		const activity: CommitActivity = {
			days: days.length ? days : emptyCommitActivity().days,
			updatedAt: new Date().toISOString(),
		};
		cache[cacheKey] = activity;
		await writeCache(cache);
		return activity;
	} catch {
		console.warn(`Commit activity fetch failed for ${repoSlug}`);
		return cached ?? emptyCommitActivity();
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

	if (isDev && isMilestoneProgress(cached)) {
		return cached;
	}

	if (!token) {
		if (isMilestoneProgress(cached)) return cached;
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
	} catch {
		console.warn(`Milestone fetch failed for ${repoSlug}#${milestoneId}`);
		if (isMilestoneProgress(cached)) return cached;
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