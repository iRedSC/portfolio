import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

interface SkillNode {
  id: string;
  name: string;
  level: number;
  dependencies?: string[];
  description?: string;
}

interface SkillPath {
  id: string;
  name: string;
  description: string;
  nodes: SkillNode[];
}

export function loadSkillPaths(): SkillPath[] {
  const skillPathsDir = join(process.cwd(), 'data', 'skill-paths');

  try {
    const files = readdirSync(skillPathsDir);
    const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

    return yamlFiles.map(file => {
      const filePath = join(skillPathsDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const data = parse(content) as SkillPath;

      // Validate structure
      if (!data.id || !data.name || !Array.isArray(data.nodes)) {
        throw new Error(`Invalid skill path structure in ${file}`);
      }

      return data;
    });
  } catch (error) {
    console.error('Error loading skill paths:', error);
    return [];
  }
}

export function getSkillPathById(id: string): SkillPath | undefined {
  const paths = loadSkillPaths();
  return paths.find(path => path.id === id);
}