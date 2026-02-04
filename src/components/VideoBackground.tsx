/**
 * Uses videos from src/assets/background_videos as card backgrounds.
 * Picks a deterministic video per slug so each post has a consistent background.
 */

import birds from '../assets/background_videos/birds.mp4';
import dots from '../assets/background_videos/dots.mp4';
import net from '../assets/background_videos/net.mp4';

const VIDEOS = [birds, dots, net];

function hashString(str: string): number {
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h = (h << 5) - h + ch;
		h = h & h;
	}
	return Math.abs(h);
}

function pickVideo(slug: string): string {
	const idx = hashString(slug) % VIDEOS.length;
	return VIDEOS[idx];
}

interface VideoBackgroundProps {
	slug: string;
}

export default function VideoBackground({ slug }: VideoBackgroundProps) {
	const src = pickVideo(slug);

	return (
		<div className="video-bg" aria-hidden style={{ background: '#1a1410' }}>
			<video
				src={src}
				autoPlay
				muted
				loop
				playsInline
				className="video-bg-item"
			/>
		</div>
	);
}
