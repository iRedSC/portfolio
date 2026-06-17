import { useState, useMemo, useEffect } from 'react';
import CaseStudyCard from './CaseStudyCard';

interface CaseStudy {
	title: string;
	description: string;
	pubDate: Date;
	tags: string[];
	slug: string;
	readingTime?: number;
}

interface CaseStudyFilterProps {
	caseStudies: CaseStudy[];
}

export default function CaseStudyFilter({ caseStudies = [] }: CaseStudyFilterProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const safeCaseStudies = Array.isArray(caseStudies) ? caseStudies : [];

	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		safeCaseStudies.forEach((study) => {
			study.tags.forEach((tag) => tagSet.add(tag));
		});
		return Array.from(tagSet).sort();
	}, [safeCaseStudies]);

	const filteredCaseStudies = useMemo(() => {
		return safeCaseStudies.filter((study) => {
			const matchesSearch =
				searchQuery === '' ||
				study.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				study.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				study.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesTags =
				selectedTags.length === 0 ||
				selectedTags.every((tag) => study.tags.includes(tag));

			return matchesSearch && matchesTags;
		});
	}, [safeCaseStudies, searchQuery, selectedTags]);

	useEffect(() => {
		const handleFilterByTag = (e: CustomEvent<{ tag: string }>) => {
			const tag = e.detail?.tag;
			if (!tag) return;
			setSelectedTags((prev) => (prev.includes(tag) ? [] : [tag]));
		};
		window.addEventListener('filterByTag' as never, handleFilterByTag as never);
		return () =>
			window.removeEventListener('filterByTag' as never, handleFilterByTag as never);
	}, []);

	const toggleTag = (tag: string) => {
		setSelectedTags((prev) => (prev.includes(tag) ? [] : [tag]));
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
							placeholder="Search case studies..."
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
						{filteredCaseStudies.length} of {safeCaseStudies.length} case studies
					</span>
				</div>
			</div>
			<div id="filtered-case-studies" className="card-grid blog-cards-with-video">
				{filteredCaseStudies.map((study) => (
					<CaseStudyCard
						key={study.slug}
						title={study.title}
						description={study.description}
						pubDate={
							study.pubDate instanceof Date
								? study.pubDate
								: new Date(study.pubDate)
						}
						tags={study.tags}
						slug={study.slug}
						readingTime={study.readingTime}
					/>
				))}
			</div>
		</>
	);
}
