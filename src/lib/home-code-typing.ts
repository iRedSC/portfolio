import { flattenTokens, tokenizeLine, type SyntaxChar, type SyntaxTokenType } from './home-code-syntax';

const WORD_CHAR_MS = 5;
const WORD_JITTER_MS = 7;
const SPACE_PAUSE_MS = 28;
const SPACE_JITTER_MS = 22;
const LINE_BREAK_MS = 55;
const TAB_WIDTH = 4;

function pickRandomSource(sources: string[]): string {
	return sources[Math.floor(Math.random() * sources.length)] ?? '';
}

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function charDelay(char: string): number {
	if (char === ' ' || char === '\t') {
		return SPACE_PAUSE_MS + Math.random() * SPACE_JITTER_MS;
	}

	let delay = WORD_CHAR_MS + Math.random() * WORD_JITTER_MS;

	if ('{}();,'.includes(char)) delay += 4 + Math.random() * 8;
	if (char === ';') delay += 3 + Math.random() * 6;

	return delay;
}

function lineBreakDelay(): number {
	return LINE_BREAK_MS + Math.random() * 35;
}

function splitLeadingIndent(line: string): { indent: string; rest: string } {
	const match = /^(\s+)/.exec(line);
	if (!match) return { indent: '', rest: line };
	return { indent: match[1], rest: line.slice(match[1].length) };
}

function indentColumns(indent: string): number {
	let cols = 0;
	for (const char of indent) {
		if (char === '\t') cols += TAB_WIDTH;
		else if (char === ' ') cols += 1;
	}
	return cols;
}

export function initHomeCodeTyping(container: HTMLElement, sources: string[]): void {
	if (prefersReducedMotion() || sources.length === 0) return;

	const lines = pickRandomSource(sources).replace(/\r\n/g, '\n').split('\n');
	let lineIndex = 0;
	let charIndex = 0;
	let pendingChars: SyntaxChar[] = [];
	let currentLineEl: HTMLDivElement | null = null;
	let cursorEl: HTMLSpanElement | null = null;
	let activeSpan: HTMLSpanElement | null = null;
	let activeSpanType: SyntaxTokenType | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;

	function clearTimer(): void {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function schedule(next: () => void, delayMs: number): void {
		clearTimer();
		timer = setTimeout(next, delayMs);
	}

	function stopTyping(): void {
		clearTimer();
		cursorEl?.remove();
		cursorEl = null;
		currentLineEl = null;
		activeSpan = null;
		activeSpanType = null;
	}

	function ensureLine(): void {
		if (currentLineEl) return;

		currentLineEl = document.createElement('div');
		currentLineEl.className = 'home-code-typing__line';
		container.appendChild(currentLineEl);

		cursorEl = document.createElement('span');
		cursorEl.className = 'home-code-typing__cursor';
		cursorEl.textContent = '\u258D';
		currentLineEl.appendChild(cursorEl);
	}

	function ensureCharSpan(type: SyntaxTokenType): HTMLSpanElement {
		if (activeSpan && activeSpanType === type) return activeSpan;

		activeSpan = document.createElement('span');
		activeSpan.className = `home-code-typing__token home-code-typing__token--${type}`;
		currentLineEl!.insertBefore(activeSpan, cursorEl);
		activeSpanType = type;
		return activeSpan;
	}

	function finishLine(): void {
		cursorEl?.remove();
		cursorEl = null;
		currentLineEl = null;
		activeSpan = null;
		activeSpanType = null;
		pendingChars = [];
		lineIndex += 1;
		charIndex = 0;
	}

	function prepareLineChars(line: string): void {
		const { indent, rest } = splitLeadingIndent(line);

		if (currentLineEl) {
			const cols = indentColumns(indent);
			currentLineEl.style.paddingLeft = cols > 0 ? `${cols}ch` : '';
		}

		pendingChars = flattenTokens(tokenizeLine(rest));
		charIndex = 0;
	}

	function atVerticalLimit(): boolean {
		const lastLine = container.lastElementChild as HTMLElement | null;
		if (!lastLine) return false;

		const lineHeight = parseFloat(getComputedStyle(container).lineHeight) || 20;
		const containerBottom = container.getBoundingClientRect().bottom;
		return lastLine.getBoundingClientRect().bottom + lineHeight > containerBottom + 1;
	}

	function tick(): void {
		if (lineIndex >= lines.length) {
			stopTyping();
			return;
		}

		if (!currentLineEl && atVerticalLimit()) {
			stopTyping();
			return;
		}

		ensureLine();
		const line = lines[lineIndex] ?? '';

		if (pendingChars.length === 0 && charIndex === 0) {
			prepareLineChars(line);
		}

		if (charIndex >= pendingChars.length) {
			finishLine();
			schedule(tick, lineBreakDelay());
			return;
		}

		const { type, char } = pendingChars[charIndex] ?? { type: 'plain' as const, char: '' };
		const span = ensureCharSpan(type);
		span.append(char);
		charIndex += 1;

		schedule(tick, charDelay(char));
	}

	tick();
}
