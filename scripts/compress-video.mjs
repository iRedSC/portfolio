#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'fs';
import { basename, dirname, extname, join, relative, resolve } from 'path';

const DEFAULT_CRF = 28;
const DEFAULT_MAX_WIDTH = 1280;
const DEFAULT_PRESET = 'slow';

function usage() {
	console.log(`Usage: bun run compress-video <input-video> [options]

Options:
  --output <path>      Write compressed video to a specific path.
  --replace            Replace the input file after compression.
  --crf <number>       H.264 quality value. Lower is larger/better. Default: ${DEFAULT_CRF}.
  --max-width <px>     Downscale wider videos to this width. Default: ${DEFAULT_MAX_WIDTH}.
  --preset <name>      x264 preset. Slower usually compresses better. Default: ${DEFAULT_PRESET}.

When --replace is used, the original is saved under .cache/original-videos/.`);
}

function parseArgs(argv) {
	const args = {
		input: null,
		output: null,
		replace: false,
		crf: DEFAULT_CRF,
		maxWidth: DEFAULT_MAX_WIDTH,
		preset: DEFAULT_PRESET,
	};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--help' || arg === '-h') {
			args.help = true;
		} else if (arg === '--replace') {
			args.replace = true;
		} else if (arg === '--output') {
			args.output = argv[++i];
		} else if (arg === '--crf') {
			args.crf = Number(argv[++i]);
		} else if (arg === '--max-width') {
			args.maxWidth = Number(argv[++i]);
		} else if (arg === '--preset') {
			args.preset = argv[++i];
		} else if (!args.input) {
			args.input = arg;
		} else {
			throw new Error(`Unexpected argument: ${arg}`);
		}
	}

	return args;
}

function requireNumber(name, value, min, max) {
	if (!Number.isFinite(value) || value < min || value > max) {
		throw new Error(`${name} must be a number between ${min} and ${max}.`);
	}
}

function formatBytes(bytes) {
	const units = ['B', 'KB', 'MB', 'GB'];
	let size = bytes;
	let unit = 0;
	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}
	return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'inherit' });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with code ${code}`));
		});
	});
}

function runCapture(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve(stdout.trim());
			else reject(new Error((stderr || `${command} exited with code ${code}`).trim()));
		});
	});
}

function defaultOutputFor(input) {
	const extension = extname(input);
	return join(dirname(input), `${basename(input, extension)}.compressed${extension || '.mp4'}`);
}

function backupPathFor(input) {
	const absoluteInput = resolve(input);
	const projectRelative = relative(process.cwd(), absoluteInput);
	const safeRelative = projectRelative.startsWith('..') ? basename(input) : projectRelative;
	return join(process.cwd(), '.cache', 'original-videos', safeRelative);
}

async function probeVideoCodec(input) {
	const codec = await runCapture('ffprobe', [
		'-v',
		'error',
		'-select_streams',
		'v:0',
		'-show_entries',
		'stream=codec_name',
		'-of',
		'default=nokey=1:noprint_wrappers=1',
		input,
	]);
	return codec.split('\n')[0]?.trim();
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help || !args.input) {
		usage();
		process.exit(args.help ? 0 : 1);
	}

	requireNumber('--crf', args.crf, 0, 51);
	requireNumber('--max-width', args.maxWidth, 16, 7680);

	if (!existsSync(args.input)) {
		throw new Error(`Input file does not exist: ${args.input}`);
	}
	if (args.output && args.replace) {
		throw new Error('Use either --output or --replace, not both.');
	}

	const output = args.output || defaultOutputFor(args.input);
	const tempOutput = args.replace
		? join(dirname(args.input), `.${basename(args.input)}.compressing-${Date.now()}.mp4`)
		: output;

	const scaleFilter = `scale='min(${args.maxWidth},iw)':-2`;
	const ffmpegArgs = [
		'-y',
		'-i',
		args.input,
		'-map',
		'0:v:0',
		'-map',
		'0:a?',
		'-vf',
		scaleFilter,
		'-c:v',
		'libx264',
		'-preset',
		args.preset,
		'-crf',
		String(args.crf),
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		'-c:a',
		'aac',
		'-b:a',
		'128k',
		tempOutput,
	];

	const originalSize = statSync(args.input).size;
	console.log(`Compressing ${args.input} (${formatBytes(originalSize)})`);
	console.log(`Settings: crf=${args.crf}, max-width=${args.maxWidth}, preset=${args.preset}`);

	const codec = await probeVideoCodec(args.input);
	if (!codec || codec === 'unknown') {
		throw new Error(
			`Unsupported or unknown video codec in ${args.input}. Re-export the source as H.264, HEVC, or ProRes, then run this script again.`,
		);
	}

	await run('ffmpeg', ffmpegArgs);

	if (args.replace) {
		const backup = backupPathFor(args.input);
		if (!existsSync(backup)) {
			mkdirSync(dirname(backup), { recursive: true });
			renameSync(args.input, backup);
			console.log(`Saved original as ${backup}`);
		} else {
			unlinkSync(args.input);
			console.log(`Original backup already exists at ${backup}`);
		}
		renameSync(tempOutput, args.input);
	}

	const finalOutput = args.replace ? args.input : output;
	const compressedSize = statSync(finalOutput).size;
	const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
	console.log(`Wrote ${finalOutput} (${formatBytes(compressedSize)}, ${reduction}% smaller)`);
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
