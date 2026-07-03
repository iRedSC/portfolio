// One-off generator for the default social-embed metadata card (Discord/Twitter/etc.)
// Run with: node scripts/generate-og-image.mjs
// Requires Inter (Regular/Medium/SemiBold/Bold/ExtraBold) to be installed as a system font
// for crisp text rendering; falls back to the system sans-serif otherwise.
import sharp from 'sharp';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'og-image.png');

const W = 1200;
const H = 630;

const BG = '#fef9f3';
const TEXT = '#2d1810';
const MUTED = '#8b6e5a';
const ACCENT = '#ea5a2e';
const ACCENT_SOFT = '#ffe8df';
const BORDER = '#f0dcc7';

// Favicon "M" mark, normalized to a 0..1 box (source viewBox is 225x226).
const M_PATH_1 =
	'M0.324707 112.673V0H0.471799L60.6329 85.3141L51.5131 83.2548L111.527 0H111.821V112.673H90.4929V48.0995L91.8167 59.1315L55.1905 111.202H54.8963L17.2404 59.1315L20.9178 48.982V112.673H0.324707Z';
const M_PATH_2 =
	'M111.497 112.674L111.497 225.347L111.35 225.347L51.1885 140.033L60.3083 142.092L0.294228 225.347L3.05176e-05 225.347L4.03678e-05 112.673L21.3286 112.673L21.3286 177.247L20.0047 166.215L56.6309 114.144L56.9251 114.144L94.581 166.215L90.9037 176.365L90.9037 112.674L111.497 112.674Z';
const M_PATH_3 =
	'M111.716 112.673H223.2V133.266H177.729V225.235H156.4V133.266H111.716V112.673Z';
const M_PATH_4 =
	'M223.2 112.588L111.716 112.588L111.716 91.9948L157.188 91.9948L157.188 0.0261707L178.516 0.0261725L178.516 91.9948L223.2 91.9948L223.2 112.588Z';

function markGroup({ x, y, size, opacity = 1, fill = ACCENT }) {
	const scale = size / 226;
	return `
	<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
		<path d="${M_PATH_1}" fill="${fill}" />
		<path d="${M_PATH_2}" fill="${fill}" />
		<path d="${M_PATH_3}" fill="${fill}" />
		<path d="${M_PATH_4}" fill="${fill}" />
	</g>`;
}

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<radialGradient id="glow" cx="82%" cy="12%" r="65%">
			<stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.16" />
			<stop offset="100%" stop-color="${ACCENT}" stop-opacity="0" />
		</radialGradient>
		<pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
			<circle cx="2" cy="2" r="1.6" fill="${BORDER}" />
		</pattern>
		<linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
			<stop offset="55%" stop-color="${BG}" stop-opacity="0" />
			<stop offset="100%" stop-color="${BG}" stop-opacity="1" />
		</linearGradient>
		<clipPath id="frame"><rect x="0" y="0" width="${W}" height="${H}" /></clipPath>
	</defs>

	<rect width="${W}" height="${H}" fill="${BG}" />
	<rect width="${W}" height="${H}" fill="url(#dots)" />
	<rect width="${W}" height="${H}" fill="url(#fade)" />
	<rect width="${W}" height="${H}" fill="url(#glow)" />

	<g clip-path="url(#frame)">
		${markGroup({ x: 905, y: -70, size: 560, opacity: 0.05, fill: TEXT })}
	</g>

	<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="${BORDER}" stroke-width="2" />

	<!-- Wordmark -->
	${markGroup({ x: 80, y: 74, size: 46 })}
	<text x="140" y="115" font-family="Inter, sans-serif" font-weight="700" font-size="26" letter-spacing="0.5" fill="${TEXT}">Mason Trout</text>

	<!-- Headline -->
	<text x="80" y="290" font-family="Inter, sans-serif" font-weight="800" font-size="66" fill="${TEXT}">I design for</text>
	<text x="80" y="368" font-family="Inter, sans-serif" font-weight="800" font-size="66" fill="${ACCENT}">least friction.</text>

	<!-- Subtitle -->
	<text x="80" y="428" font-family="Inter, sans-serif" font-weight="500" font-size="28" fill="${MUTED}">Portfolio of projects, writing &amp; engineering.</text>

	<!-- Bottom chip row -->
	<g transform="translate(80 486)">
		<rect x="0" y="0" width="238" height="52" rx="26" fill="${ACCENT_SOFT}" />
		<circle cx="27" cy="26" r="6" fill="${ACCENT}" />
		<text x="44" y="34" font-family="Inter, sans-serif" font-weight="600" font-size="22" fill="${ACCENT}">masonltrout.me</text>
	</g>
	<g transform="translate(338 486)">
		<rect x="0" y="0" width="128" height="52" rx="26" fill="none" stroke="${BORDER}" stroke-width="2" />
		<text x="64" y="34" font-family="Inter, sans-serif" font-weight="600" font-size="20" fill="${MUTED}" text-anchor="middle">Blog</text>
	</g>
	<g transform="translate(486 486)">
		<rect x="0" y="0" width="178" height="52" rx="26" fill="none" stroke="${BORDER}" stroke-width="2" />
		<text x="89" y="34" font-family="Inter, sans-serif" font-weight="600" font-size="20" fill="${MUTED}" text-anchor="middle">Case Studies</text>
	</g>
</svg>`;

const png = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
writeFileSync(OUT, png);
console.log(`Wrote ${OUT} (${(png.length / 1024).toFixed(1)} KB)`);
