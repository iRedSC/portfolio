import { useMemo, useState } from 'react';
import { matchesQuery, uniqueTags } from './filterUtils';

type ProjectItem = {
	title: string;
	description: string;
	tags: string[];
	slug: string;
	progress: number;
	status: string;
};

type Props = {
	items: ProjectItem[];
};

export default function ProjectsFilter({ items }: Props) {
	const [query, setQuery] = useState('');
	const [activeTag, setActiveTag] = useState<string | null>(null);
	const [status, setStatus] = useState<string>('all');
	const tags = useMemo(() => uniqueTags(items), [items]);

	const filtered = useMemo(() => {
		return items.filter((item) => {
			const matchesText =
				matchesQuery(item.title, query) || matchesQuery(item.description, query);
			const matchesTag = activeTag ? item.tags.includes(activeTag) : true;
			const matchesStatus = status === 'all' ? true : item.status === status;
			return matchesText && matchesTag && matchesStatus;
		});
	}, [items, query, activeTag, status]);

	return (
		<div>
			<div className="filter-controls">
				<input
					className="filter-input"
					type="search"
					placeholder="Search projects"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
				{['all', 'active', 'complete', 'archived'].map((option) => (
					<button
						key={option}
						className={`chip ${status === option ? 'active' : ''}`}
						onClick={() => setStatus(option)}
					>
						{option.charAt(0).toUpperCase() + option.slice(1)}
					</button>
				))}
				{tags.map((tag) => (
					<button
						key={tag}
						className={`chip ${activeTag === tag ? 'active' : ''}`}
						onClick={() => setActiveTag(activeTag === tag ? null : tag)}
					>
						{tag.charAt(0).toUpperCase() + tag.slice(1)}
					</button>
				))}
			</div>
			<div className="card-grid">
				{filtered.map((item) => (
					<a key={item.slug} href={`/projects/${item.slug}`} className="card">
						<h3>{item.title}</h3>
						<p>{item.description}</p>
						<div className="progress" aria-label={`Progress ${item.progress}%`}>
							<span style={{ width: `${item.progress}%` }} />
						</div>
						<div>
							{item.tags.map((tag) => (
								<span key={tag} className="tag">
									{tag.charAt(0).toUpperCase() + tag.slice(1)}
								</span>
							))}
						</div>
					</a>
				))}
			</div>
		</div>
	);
}
