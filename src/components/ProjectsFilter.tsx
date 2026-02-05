import { useState, useMemo, useEffect } from 'react';

export interface ProjectForFilter {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  heroImage?: string;
  demoURL?: string;
  repoURL?: string;
  language?: string;
  progress?: number;
}

interface ProjectsFilterProps {
  projects: ProjectForFilter[];
}

export default function ProjectsFilter({ projects = [] }: ProjectsFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const safeProjects = Array.isArray(projects) ? projects : [];

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    safeProjects.forEach((p) => p.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [safeProjects]);

  const filteredProjects = useMemo(() => {
    return safeProjects.filter((project) => {
      const matchesSearch =
        searchQuery === '' ||
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => project.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [safeProjects, searchQuery, selectedTags]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('filteredProjectsUpdate', { detail: filteredProjects })
    );
  }, [filteredProjects]);

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
            placeholder="Search projects..."
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
          {filteredProjects.length} of {safeProjects.length} projects
        </span>
      </div>
    </div>
  );
}
