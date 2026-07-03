interface BlogCardProps {
	title: string;
	description: string;
	pubDate: Date | string;
	tags: string[];
	slug: string;
	readingTime?: number;
	thumbnail?: string;
}

export default function BlogCard({
	title,
	description,
	pubDate,
	tags,
	slug,
	readingTime,
	thumbnail,
}: BlogCardProps) {
	const date = typeof pubDate === 'string' ? new Date(pubDate) : pubDate;
	const formattedDate = date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const isoDate = date.toISOString();

	const handleTagClick = (e: React.MouseEvent, tag: string) => {
		e.preventDefault();
		e.stopPropagation();
		window.dispatchEvent(new CustomEvent('filterByTag', { detail: { tag } }));
	};

	return (
		<a
			href={`/blog/${slug}`}
			className={`blog-card${thumbnail ? ' blog-card--has-thumbnail' : ''}`}
		>
			{thumbnail && (
				<div className="blog-card-thumbnail" aria-hidden="true">
					<img src={thumbnail} alt="" loading="lazy" />
				</div>
			)}
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
						<time dateTime={isoDate}>{formattedDate}</time>
						{readingTime != null && (
							<span className="reading-time">{readingTime} min read</span>
						)}
					</div>
				</div>
			</div>
		</a>
	);
}
