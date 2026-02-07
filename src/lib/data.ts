import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

export type SkillPath = {
	name: string;
	nodes: {
		name: string;
		amount: number;
		skills: { name: string }[];
	}[];
};

export type Accomplishment = {
	name: string;
};

const dataDir = path.join(process.cwd(), 'src', 'data');

async function readYamlFile<T>(filePath: string): Promise<T> {
	const raw = await fs.readFile(filePath, 'utf-8');
	return parse(raw) as T;
}

export async function getSkillPaths(): Promise<SkillPath[]> {
	const skillsDir = path.join(dataDir, 'skill-paths');
	const files = await fs.readdir(skillsDir);
	const paths = await Promise.all(
		files
			.filter((file) => file.endsWith('.yaml'))
			.map((file) => readYamlFile<SkillPath>(path.join(skillsDir, file))),
	);
	return paths;
}

export async function getAccomplishments(): Promise<Accomplishment[]> {
	const filePath = path.join(dataDir, 'accomplishments.yaml');
	return readYamlFile<Accomplishment[]>(filePath);
}
