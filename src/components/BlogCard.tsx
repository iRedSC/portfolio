import VideoBackground from './VideoBackground';

interface BlogCardProps {
	title: string;
	description: string;
	pubDate: Date;
	tags: string[];
	slug: string;
	readingTime?: number;
}

export default function BlogCard({
	title,
	description,
	pubDate,
	tags,
	slug,
	readingTime,
}: BlogCardProps) {
	const formattedDate = pubDate.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	const handleTagClick = (e: React.MouseEvent, tag: string) => {
		e.preventDefault();
		e.stopPropagation();
		window.dispatchEvent(new CustomEvent('filterByTag', { detail: { tag } }));
	};

	return (
		<a href={`/blog/${slug}`} className="blog-card blog-card--video">
			<VideoBackground slug={slug} />
			<div className="blog-card-overlay" aria-hidden />
			<div className="blog-card-content">
				<div className="blog-card-top">
					<h3 className="blog-title">{title}</h3>
					<p className="blog-description">{description}</p>
				</div>
				<div className="blog-card-bottom">
					<div className="blog-tags">
						{tags.map((tag) => (
							<button
								key={tag}
								type="button"
								className="tag tag-clickable"
								data-tag={tag}
								onClick={(e) => handleTagClick(e, tag)}
								aria-label={`Filter by ${tag}`}
							>
								{tag}
							</button>
						))}
					</div>
					<div className="blog-meta">
						<time dateTime={pubDate.toISOString()}>{formattedDate}</time>
						{readingTime != null && (
							<span className="reading-time">{readingTime} min read</span>
						)}
					</div>
				</div>
			</div>
		</a>
	);
}
