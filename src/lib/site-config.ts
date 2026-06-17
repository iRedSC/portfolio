import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

export type SiteSections = {
	projects: boolean;
	tldrs: boolean;
	caseStudies: boolean;
};

export type SiteConfig = {
	sections: SiteSections;
};

const DEFAULT_SECTIONS: SiteSections = {
	projects: true,
	tldrs: true,
	caseStudies: true,
};

const configPath = path.join(process.cwd(), 'src', 'data', 'site.yaml');

export async function getSiteConfig(): Promise<SiteConfig> {
	try {
		const raw = await fs.readFile(configPath, 'utf-8');
		const parsed = parse(raw) as Partial<SiteConfig>;
		return {
			sections: {
				...DEFAULT_SECTIONS,
				...parsed.sections,
			},
		};
	} catch {
		return { sections: DEFAULT_SECTIONS };
	}
}
