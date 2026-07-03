export const COMMIT_HEATMAP_DAYS = 30;

export type CommitDay = {
	date: string;
	count: number;
};

export function getCommitLevel(count: number, max: number): number {
	if (count === 0) return 0;
	const ratio = count / max;
	if (ratio <= 0.25) return 1;
	if (ratio <= 0.5) return 2;
	if (ratio <= 0.75) return 3;
	return 4;
}

export function getCommitLevels(days: CommitDay[]): number[] {
	const max = Math.max(...days.map((day) => day.count), 1);
	return days.map((day) => getCommitLevel(day.count, max));
}

export function formatDayLabel(date: string): string {
	return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

export function renderCommitHeatmapHtml(days: CommitDay[]): string {
	if (!days.length) return '';

	const levels = getCommitLevels(days);
	const totalCommits = days.reduce((sum, day) => sum + day.count, 0);

	const boxes = days
		.map((day, index) => {
			const countLabel = day.count === 1 ? '1 commit' : `${day.count} commits`;
			const label = formatDayLabel(day.date);
			return `<span class="commit-heatmap-box level-${levels[index]}" tabindex="0" role="gridcell" aria-label="${countLabel}, ${day.date}"><span class="commit-heatmap-tooltip" aria-hidden="true"><strong>${countLabel}</strong><span>${label}</span></span></span>`;
		})
		.join('');

	return `<div class="commit-heatmap" role="img" aria-label="${totalCommits} commits in the last ${COMMIT_HEATMAP_DAYS} days">${boxes}</div>`;
}
