#!/usr/bin/env node
/**
 * Pre-renders Vanta.js effects as 30-second videos.
 * Requires: puppeteer, ffmpeg (system)
 * Output: public/vanta/{effect}.mp4
 */

import { createServer } from 'http';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

function findChrome() {
	const paths = [
		process.env.PUPPETEER_EXECUTABLE_PATH,
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/usr/bin/google-chrome',
		'/usr/bin/google-chrome-stable',
		'/snap/bin/chromium',
	].filter(Boolean);
	return paths.find((p) => existsSync(p));
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const EFFECTS = ['birds'];
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const DURATION_SEC = 30;
const FRAME_COUNT = FPS * DURATION_SEC;

function serveHtml(req, res) {
	const htmlPath = join(__dirname, 'vanta-render.html');
	const html = readFileSync(htmlPath, 'utf-8');
	res.writeHead(200, { 'Content-Type': 'text/html' });
	res.end(html);
}

async function startServer() {
	return new Promise((resolve) => {
		const server = createServer((req, res) => {
			if (req.url?.startsWith('/')) {
				serveHtml(req, res);
			} else {
				res.writeHead(404);
				res.end();
			}
		});
		server.listen(0, '127.0.0.1', () => {
			const port = server.address().port;
			resolve({ server, port });
		});
	});
}

async function checkFfmpeg() {
	return new Promise((resolve) => {
		const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
		proc.on('error', () => resolve(false));
		proc.on('close', (code) => resolve(code === 0));
	});
}

async function framesToVideo(framesDir, outputPath) {
	return new Promise((resolve, reject) => {
		const args = [
			'-y',
			'-framerate', String(FPS),
			'-i', join(framesDir, 'frame_%04d.png'),
			'-c:v', 'libx264',
			'-pix_fmt', 'yuv420p',
			'-t', String(DURATION_SEC),
			outputPath,
		];
		const proc = spawn('ffmpeg', args, { stdio: 'inherit' });
		proc.on('error', reject);
		proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
	});
}

async function renderEffect(effect, port) {
	const { launch } = await import('puppeteer');
	const executablePath = findChrome();
	const launchOpts = {
		headless: 'new',
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
	};
	if (executablePath) {
		launchOpts.executablePath = executablePath;
	}
	const browser = await launch(launchOpts);

	const outDir = join(PROJECT_ROOT, 'public', 'vanta');
	const framesDir = join(PROJECT_ROOT, '.cache', 'vanta-frames', effect);
	mkdirSync(framesDir, { recursive: true });

	const page = await browser.newPage();
	await page.setViewport({ width: WIDTH, height: HEIGHT });
	await page.goto(`http://127.0.0.1:${port}/?effect=${effect}`, {
		waitUntil: 'networkidle0',
		timeout: 15000,
	});

	// Wait for Vanta to initialize
	await page.waitForFunction('window.vantaEffect != null', { timeout: 5000 }).catch(() => {});
	await new Promise((r) => setTimeout(r, 1500));

	const frameInterval = 1000 / FPS;
	const start = Date.now();

	for (let i = 0; i < FRAME_COUNT; i++) {
		await page.screenshot({
			path: join(framesDir, `frame_${String(i + 1).padStart(4, '0')}.png`),
			type: 'png',
		});
		const elapsed = Date.now() - start;
		const target = (i + 1) * frameInterval;
		if (target > elapsed) {
			await new Promise((r) => setTimeout(r, target - elapsed));
		}
		if ((i + 1) % 90 === 0) {
			console.log(`  ${effect}: ${i + 1}/${FRAME_COUNT} frames`);
		}
	}

	await browser.close();

	const outputPath = join(outDir, `${effect}.mp4`);
	await framesToVideo(framesDir, outputPath);
	console.log(`  ${effect}: saved to ${outputPath}`);

	// Cleanup frames
	const { rmSync } = await import('fs');
	rmSync(framesDir, { recursive: true, force: true });
}

async function main() {
	if (!(await checkFfmpeg())) {
		console.error('Error: ffmpeg is required. Install it with: apt install ffmpeg (Linux) or brew install ffmpeg (macOS)');
		process.exit(1);
	}

	mkdirSync(join(PROJECT_ROOT, 'public', 'vanta'), { recursive: true });

	const { server, port } = await startServer();
	console.log(`Server running at http://127.0.0.1:${port}`);

	try {
		const chromePath = findChrome();
		if (chromePath) {
			console.log(`Using browser: ${chromePath}`);
		} else {
			console.log('Using Puppeteer bundled Chrome (install chromium if you see libnspr4 errors)');
		}
		for (const effect of EFFECTS) {
			console.log(`Rendering ${effect}...`);
			await renderEffect(effect, port);
		}
	} finally {
		server.close();
	}

	console.log('Done. Videos saved to public/vanta/');
}

main().catch((err) => {
	console.error(err.message || err);
	if (err.message?.includes('libnspr4') || err.message?.includes('shared libraries')) {
		console.error('\nFix: Install Chromium and its dependencies, then set PUPPETEER_EXECUTABLE_PATH:');
		console.error('  apt install chromium-browser  # or: chromium');
		console.error('  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium');
	}
	process.exit(1);
});
