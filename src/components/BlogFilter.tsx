import { useState, useMemo, useEffect } from 'react';

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

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    safePosts.forEach(post => {
      post.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [safePosts]);

  // Filter posts based on search and tags
  const filteredPosts = useMemo(() => {
    return safePosts.filter(post => {
      const matchesSearch = searchQuery === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every(tag => post.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [safePosts, searchQuery, selectedTags]);

  // Notify parent: dispatch custom event so the blog page can update the grid (Astro cannot pass functions to client components)
  useEffect(() => {
    onFilteredPosts?.(filteredPosts);
    window.dispatchEvent(
      new CustomEvent('filteredPostsUpdate', { detail: filteredPosts })
    );
  }, [filteredPosts, onFilteredPosts]);

  // Listen for tag clicks from card tags (same behavior as clicking a filter chip)
  useEffect(() => {
    const handleFilterByTag = (e: CustomEvent<{ tag: string }>) => {
      const tag = e.detail?.tag;
      if (!tag) return;
      setSelectedTags(prev =>
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
    };
    window.addEventListener('filterByTag' as any, handleFilterByTag as any);
    return () => window.removeEventListener('filterByTag' as any, handleFilterByTag as any);
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  return (
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
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
              >
                {tag}
                {selectedTags.includes(tag) && <span className="remove-tag">×</span>}
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
  );
}