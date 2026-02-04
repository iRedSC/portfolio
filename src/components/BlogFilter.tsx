import { useState, useMemo, useEffect } from 'react';
import BlogCard from './BlogCard';

interface BlogPost {
	title: string;
	description: string;
	pubDate: Date;
	tags: string[];
	slug: string;
	readingTime?: number;
}

interface BlogFilterProps {
	posts: BlogPost[];
	onFilteredPosts?: (posts: BlogPost[]) => void;
}

export default function BlogFilter({ posts = [], onFilteredPosts }: BlogFilterProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const safePosts = Array.isArray(posts) ? posts : [];

	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		safePosts.forEach((post) => {
			post.tags.forEach((tag) => tagSet.add(tag));
		});
		return Array.from(tagSet).sort();
	}, [safePosts]);

	const filteredPosts = useMemo(() => {
		return safePosts.filter((post) => {
			const matchesSearch =
				searchQuery === '' ||
				post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesTags =
				selectedTags.length === 0 ||
				selectedTags.every((tag) => post.tags.includes(tag));

			return matchesSearch && matchesTags;
		});
	}, [safePosts, searchQuery, selectedTags]);

	useEffect(() => {
		onFilteredPosts?.(filteredPosts);
		window.dispatchEvent(
			new CustomEvent('filteredPostsUpdate', { detail: filteredPosts })
		);
	}, [filteredPosts, onFilteredPosts]);

	useEffect(() => {
		const handleFilterByTag = (e: CustomEvent<{ tag: string }>) => {
			const tag = e.detail?.tag;
			if (!tag) return;
			setSelectedTags((prev) =>
				prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
			);
		};
		window.addEventListener('filterByTag' as never, handleFilterByTag as never);
		return () =>
			window.removeEventListener('filterByTag' as never, handleFilterByTag as never);
	}, []);

	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
		);
	};

	const clearFilters = () => {
		setSearchQuery('');
		setSelectedTags([]);
	};

	return (
		<>
			<div className="blog-filter">
				<div className="filter-controls">
					<div className="search-container">
						<input
							type="text"
							placeholder="Search posts..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="search-input"
						/>
					</div>
					<div className="tags-container">
						<div className="tags-list">
							{allTags.map((tag) => (
								<button
									key={tag}
									onClick={() => toggleTag(tag)}
									className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
								>
									{tag}
									{selectedTags.includes(tag) && (
										<span className="remove-tag">×</span>
									)}
								</button>
							))}
						</div>
						{(searchQuery || selectedTags.length > 0) && (
							<button onClick={clearFilters} className="clear-filters">
								Clear filters
							</button>
						)}
					</div>
				</div>
				<div className="filter-results">
					<span className="results-count">
						{filteredPosts.length} of {safePosts.length} posts
					</span>
				</div>
			</div>
			<div id="filtered-posts" className="card-grid blog-cards-with-video">
					{filteredPosts.map((post) => (
						<BlogCard
							key={post.slug}
							title={post.title}
							description={post.description}
							pubDate={
								post.pubDate instanceof Date
									? post.pubDate
									: new Date(post.pubDate)
							}
							tags={post.tags}
							slug={post.slug}
							readingTime={post.readingTime}
						/>
					))}
				</div>
		</>
	);
}
