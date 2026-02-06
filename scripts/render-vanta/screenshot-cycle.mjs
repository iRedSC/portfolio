#!/usr/bin/env node
/**
 * Loads topology, waits 5 seconds, takes a screenshot; repeats for x iterations.
 * Usage: node screenshot-cycle.mjs [count]
 *   count - number of screenshots (default: 5)
 * Output: public/vanta/screenshots/topology-{random}.png
 */

import { createServer } from 'http';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

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
const EFFECT = 'topology';
const THEME = 'dark';
const WAIT_SEC = 5;
const SIZE = 720;
const WIDTH = SIZE;
const HEIGHT = SIZE;

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

async function runCycle(count, port) {
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

	const outDir = join(PROJECT_ROOT, 'public', 'vanta', 'screenshots');
	mkdirSync(outDir, { recursive: true });

	const page = await browser.newPage();
	await page.setViewport({ width: WIDTH, height: HEIGHT });

	for (let i = 0; i < count; i++) {
		const url = `http://127.0.0.1:${port}/?effect=${EFFECT}&theme=${THEME}`;
		console.log(`[${i + 1}/${count}] Loading ${EFFECT}...`);
		await page.goto(url, { waitUntil: 'load', timeout: 60000 });

		await page.waitForFunction('window.vantaEffect != null', { timeout: 20000 }).catch(() => {});
		await new Promise((r) => setTimeout(r, 2000));

		console.log(`[${i + 1}/${count}] Waiting ${WAIT_SEC}s...`);
		await new Promise((r) => setTimeout(r, WAIT_SEC * 1000));

		const filename = `${EFFECT}-${randomBytes(6).toString('hex')}.png`;
		const path = join(outDir, filename);
		await page.screenshot({ path, type: 'png' });
		console.log(`[${i + 1}/${count}] Saved ${filename}`);
	}

	await browser.close();
	console.log(`Done. ${count} screenshots in ${outDir}`);
}

async function main() {
	const count = Math.max(1, parseInt(process.argv[2], 10) || 5);
	console.log(`Screenshot cycle: ${count} iterations (${WAIT_SEC}s wait each), theme=${THEME}`);

	mkdirSync(join(PROJECT_ROOT, 'public', 'vanta'), { recursive: true });

	const { server, port } = await startServer();
	console.log(`Server running at http://127.0.0.1:${port}`);

	try {
		const chromePath = findChrome();
		if (chromePath) console.log(`Using browser: ${chromePath}`);
		else console.log('Using Puppeteer bundled Chrome');
		await runCycle(count, port);
	} finally {
		server.close();
	}
}

main().catch((err) => {
	console.error(err.message || err);
	if (err.message?.includes('libnspr4') || err.message?.includes('shared libraries')) {
		console.error('\nFix: Install Chromium and set PUPPETEER_EXECUTABLE_PATH');
	}
	process.exit(1);
});
