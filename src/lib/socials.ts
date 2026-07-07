import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export type SocialLink = {
	name: string;
	link: string;
	icon: string;
};

export type SocialOrbitPosition = {
	angle: number;
	radius: number;
	delay: number;
};

const socialsDir = path.join(process.cwd(), 'src', 'data', 'socials');

const ICON_SIZE = 32;
const MIN_ICON_GAP = 16;
/** Headshot is ~100px radius + border; keep icon inner edge off the photo. */
const BASE_RADIUS = 142;

/** Evenly distribute icons around the headshot with minimum angular separation. */
export function layoutSocialOrbit(count: number): SocialOrbitPosition[] {
	if (count === 0) return [];

	const minAngle = ((ICON_SIZE + MIN_ICON_GAP) / BASE_RADIUS) * (180 / Math.PI);
	const useFullCircle = count >= 4;
	const arcStart = useFullCircle ? -90 : -155;
	const arcEnd = useFullCircle ? 270 : -25;
	const arcSpan = arcEnd - arcStart;
	const spacing = Math.max(minAngle, arcSpan / count);

	return Array.from({ length: count }, (_, index) => {
		const angle = arcStart + spacing * index + spacing / 2;
		const radius = BASE_RADIUS + (index % 3) * 7 - 7;
		return { angle, radius, delay: index * 0.65 };
	});
}

export async function getSocialLinks(): Promise<SocialLink[]> {
	try {
		const files = await fs.readdir(socialsDir);
		const links = await Promise.all(
			files
				.filter((file) => file.endsWith('.md'))
				.sort()
				.map(async (file) => {
					const raw = await fs.readFile(path.join(socialsDir, file), 'utf-8');
					const { data } = matter(raw);
					return {
						name: String(data.name ?? ''),
						link: String(data.link ?? ''),
						icon: String(data.icon ?? ''),
					};
				}),
		);
		return links.filter((link) => link.name && link.link && link.icon);
	} catch {
		return [];
	}
}
