import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import matter from 'gray-matter';

interface Accomplishment {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'achievement' | 'certification' | 'project' | 'milestone';
  tags?: string[];
  url?: string;
  content?: string; // For markdown content
}

export function loadAccomplishments(): Accomplishment[] {
  const accomplishmentsDir = join(process.cwd(), 'data', 'accomplishments');

  try {
    const files = readdirSync(accomplishmentsDir);
    const validFiles = files.filter(file =>
      file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.md')
    );

    return validFiles.map(file => {
      const filePath = join(accomplishmentsDir, file);
      const content = readFileSync(filePath, 'utf-8');

      try {
        if (file.endsWith('.md')) {
          // Parse markdown with frontmatter
          const { data, content: markdownContent } = matter(content);

          const accomplishment: Accomplishment = {
            id: data.id || file.replace('.md', ''),
            title: data.title || 'Untitled',
            description: data.description || '',
            date: data.date ? new Date(data.date) : new Date(),
            type: data.type || 'achievement',
            tags: data.tags || [],
            url: data.url,
            content: markdownContent,
          };

          return accomplishment;
        } else {
          // Parse YAML - handle both single objects and arrays
          const parsed = parse(content);

          if (Array.isArray(parsed)) {
            // Handle array of accomplishments
            return parsed.map((item: any) => ({
              id: item.id || `auto-${Date.now()}`,
              title: item.title || 'Untitled',
              description: item.description || '',
              date: item.date ? new Date(item.date) : new Date(),
              type: item.type || 'achievement',
              tags: item.tags || [],
              url: item.url,
            } as Accomplishment));
          } else {
            // Handle single accomplishment object
            const accomplishment: Accomplishment = {
              id: parsed.id || file.replace('.yml', '').replace('.yaml', ''),
              title: parsed.title || 'Untitled',
              description: parsed.description || '',
              date: parsed.date ? new Date(parsed.date) : new Date(),
              type: parsed.type || 'achievement',
              tags: parsed.tags || [],
              url: parsed.url,
            };

            return accomplishment;
          }
        }
      } catch (error) {
        console.warn(`Error parsing accomplishment file ${file}:`, error);
        // Return a default accomplishment on parse error
        return {
          id: `error-${file}`,
          title: 'Parse Error',
          description: `Error loading ${file}`,
          date: new Date(),
          type: 'achievement' as const,
          tags: [],
        } as Accomplishment;
      }
    })
    .flat() // Flatten in case we have arrays from YAML
    .filter(acc => acc.date) // Filter out any without dates
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  } catch (error) {
    console.error('Error loading accomplishments:', error);
    return [];
  }
}

export function getAccomplishmentsByType(type: Accomplishment['type']): Accomplishment[] {
  const accomplishments = loadAccomplishments();
  return accomplishments.filter(acc => acc.type === type);
}