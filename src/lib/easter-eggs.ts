const AWESOME = 'awesome';
const BUFFER_RESET_MS = 2500;
const RGB_CYCLE_CLASS = 'accent-rgb-cycle';
const CYCLE_DURATION_MS = 12000;
const STORAGE_KEY = 'portfolio:accent-rgb-cycle';
const ACCENT_VARS = ['--accent', '--accent-soft', '--accent-deep'] as const;

let buffer = '';
let resetTimer: ReturnType<typeof setTimeout> | null = null;
let rafId: number | null = null;
let cycleAnchor: number | null = null;
let cycling = false;

type CycleState = {
	startedAt: number;
};

function isTypingInTextField(): boolean {
	const el = document.activeElement;
	if (!el) return false;
	const tag = el.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	return el instanceof HTMLElement && el.isContentEditable;
}

function isDarkTheme(): boolean {
	const root = document.documentElement;
	if (root.classList.contains('theme-dark')) return true;
	if (root.classList.contains('theme-light')) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readCycleState(): CycleState | null {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CycleState;
		if (typeof parsed.startedAt !== 'number') return null;
		return parsed;
	} catch {
		return null;
	}
}

function writeCycleState(state: CycleState | null): void {
	try {
		if (state === null) sessionStorage.removeItem(STORAGE_KEY);
		else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		/* storage unavailable */
	}
}

function accentColors(hue: number): Record<(typeof ACCENT_VARS)[number], string> {
	const dark = isDarkTheme();
	return {
		'--accent': `hsl(${hue} 75% 55%)`,
		'--accent-soft': dark ? `hsl(${hue} 50% 18%)` : `hsl(${hue} 80% 92%)`,
		'--accent-deep': `hsl(${hue} 75% 42%)`,
	};
}

function applyHue(hue: number): void {
	const colors = accentColors(hue);
	const root = document.documentElement;
	for (const prop of ACCENT_VARS) {
		root.style.setProperty(prop, colors[prop]);
	}
}

function hueAt(now: number): number {
	if (cycleAnchor === null) return 0;
	const elapsed =
		(((now - cycleAnchor) % CYCLE_DURATION_MS) + CYCLE_DURATION_MS) % CYCLE_DURATION_MS;
	return (elapsed / CYCLE_DURATION_MS) * 360;
}

function tick(now: number): void {
	if (!cycling) return;
	applyHue(hueAt(now));
	rafId = requestAnimationFrame(tick);
}

function startCycle(anchor = Date.now()): void {
	if (cycling) return;
	cycling = true;
	cycleAnchor = anchor;
	writeCycleState({ startedAt: anchor });
	document.documentElement.classList.add(RGB_CYCLE_CLASS);
	rafId = requestAnimationFrame(tick);
}

function stopCycle(): void {
	if (!cycling) return;
	cycling = false;
	if (rafId !== null) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
	cycleAnchor = null;
	writeCycleState(null);
	document.documentElement.classList.remove(RGB_CYCLE_CLASS);
	const root = document.documentElement;
	for (const prop of ACCENT_VARS) {
		root.style.removeProperty(prop);
	}
}

function toggleRgbCycle(): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	if (cycling) stopCycle();
	else startCycle();
}

function restoreCycleIfActive(): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		writeCycleState(null);
		return;
	}
	const state = readCycleState();
	if (!state) return;
	startCycle(state.startedAt);
}

function clearBuffer(): void {
	buffer = '';
	if (resetTimer !== null) {
		clearTimeout(resetTimer);
		resetTimer = null;
	}
}

function initAwesomeEasterEgg(): void {
	restoreCycleIfActive();

	document.addEventListener('keydown', (e) => {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (isTypingInTextField()) {
			clearBuffer();
			return;
		}
		if (e.key.length !== 1) return;

		buffer += e.key.toLowerCase();
		if (buffer.length > AWESOME.length) {
			buffer = buffer.slice(-AWESOME.length);
		}

		if (resetTimer !== null) clearTimeout(resetTimer);
		resetTimer = setTimeout(clearBuffer, BUFFER_RESET_MS);

		if (buffer === AWESOME) {
			toggleRgbCycle();
			clearBuffer();
		}
	});
}

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initAwesomeEasterEgg, { once: true });
	} else {
		initAwesomeEasterEgg();
	}
}
