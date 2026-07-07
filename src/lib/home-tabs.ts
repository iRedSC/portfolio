import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

export type HomeTab = {
	id: string;
	label: string;
	body: string;
};

export type HomeTabsConfig = {
	title?: string;
	tabs: HomeTab[];
};

const filePath = path.join(process.cwd(), 'src', 'data', 'home-tabs.yaml');

export async function getHomeTabs(): Promise<HomeTabsConfig | null> {
	try {
		const raw = await fs.readFile(filePath, 'utf-8');
		const parsed = parse(raw) as HomeTabsConfig;
		if (!parsed.tabs?.length) return null;
		return parsed;
	} catch {
		return null;
	}
}
