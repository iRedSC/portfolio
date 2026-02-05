import { useState, useMemo, useEffect } from 'react';

export interface TldrForFilter {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  pubDate: string;
}

interface TldrFilterProps {
  tldrs: TldrForFilter[];
}

export default function TldrFilter({ tldrs = [] }: TldrFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const safeTldrs = Array.isArray(tldrs) ? tldrs : [];

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    safeTldrs.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [safeTldrs]);

  const filteredTldrs = useMemo(() => {
    return safeTldrs.filter((tldr) => {
      const matchesSearch =
        searchQuery === '' ||
        tldr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tldr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tldr.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => tldr.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [safeTldrs, searchQuery, selectedTags]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('filteredTldrsUpdate', { detail: filteredTldrs })
    );
  }, [filteredTldrs]);

  useEffect(() => {
    const handleFilterByTag = (e: CustomEvent<{ tag: string }>) => {
      const tag = e.detail?.tag;
      if (!tag) return;
      setSelectedTags((prev) => (prev.includes(tag) ? [] : [tag]));
    };
    window.addEventListener('filterByTag' as any, handleFilterByTag as any);
    return () =>
      window.removeEventListener('filterByTag' as any, handleFilterByTag as any);
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? [] : [tag]));
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
            placeholder="Search TLDRs..."
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
          {filteredTldrs.length} of {safeTldrs.length} TLDRs
        </span>
      </div>
    </div>
  );
}
