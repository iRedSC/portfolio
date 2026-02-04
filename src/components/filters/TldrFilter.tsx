import { useMemo, useState } from 'react';
import { matchesQuery, uniqueTags } from './filterUtils';

type TldrItem = {
	title: string;
	description: string;
	tags: string[];
	slug: string;
	publishedDate: string;
};

type Props = {
	items: TldrItem[];
};

export default function TldrFilter({ items }: Props) {
	const [query, setQuery] = useState('');
	const [activeTag, setActiveTag] = useState<string | null>(null);
	const tags = useMemo(() => uniqueTags(items), [items]);

	const filtered = useMemo(() => {
		return items.filter((item) => {
			const matchesText =
				matchesQuery(item.title, query) || matchesQuery(item.description, query);
			const matchesTag = activeTag ? item.tags.includes(activeTag) : true;
			return matchesText && matchesTag;
		});
	}, [items, query, activeTag]);

	return (
		<div>
			<div className="filter-controls">
				<input
					className="filter-input"
					type="search"
					placeholder="Search TLDRs"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
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
					<a key={item.slug} href={`/tldrs/${item.slug}`} className="card">
						<h3>{item.title}</h3>
						<p className="meta">{new Date(item.publishedDate).toLocaleDateString()}</p>
						<p>{item.description}</p>
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
