import { useMemo, useState } from 'react';
import type { CommitDay } from '../lib/commit-heatmap';
import { COMMIT_HEATMAP_DAYS, formatDayLabel, getCommitLevels } from '../lib/commit-heatmap';

type Props = {
	days: CommitDay[];
};

export default function CommitHeatmap({ days }: Props) {
	const levels = useMemo(() => getCommitLevels(days), [days]);
	const totalCommits = useMemo(
		() => days.reduce((sum, day) => sum + day.count, 0),
		[days],
	);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);

	const activeDay = activeIndex === null ? null : days[activeIndex];

	return (
		<div className="commit-heatmap commit-heatmap--interactive">
			<div
				className="commit-heatmap-track"
				role="img"
				aria-label={`${totalCommits} commits in the last ${COMMIT_HEATMAP_DAYS} days`}
			>
				{days.map((day, index) => {
					const countLabel = day.count === 1 ? '1 commit' : `${day.count} commits`;
					const isActive = activeIndex === index;

					return (
						<button
							key={day.date}
							type="button"
							className={`commit-heatmap-box level-${levels[index]}${isActive ? ' is-active' : ''}`}
							aria-label={`${countLabel}, ${day.date}`}
							aria-pressed={isActive}
							onMouseEnter={() => setActiveIndex(index)}
							onMouseLeave={() => setActiveIndex(null)}
							onFocus={() => setActiveIndex(index)}
							onBlur={() => setActiveIndex(null)}
						/>
					);
				})}
			</div>
			{activeDay && (
				<p className="commit-heatmap-caption" aria-live="polite">
					<strong>{activeDay.count === 1 ? '1 commit' : `${activeDay.count} commits`}</strong>
					{' · '}
					{formatDayLabel(activeDay.date)}
				</p>
			)}
		</div>
	);
}
