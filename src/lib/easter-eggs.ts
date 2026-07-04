const RGB_CYCLE_CLASS = 'accent-rgb-cycle';
const ACCENT_VARS = ['--accent', '--accent-soft', '--accent-deep'] as const;
const ACCENT_PHASE_OFFSETS: Record<(typeof ACCENT_VARS)[number], number> = {
	'--accent': 0,
	'--accent-soft': 120,
	'--accent-deep': 240,
};

let rafId: number | null = null;
let active = false;
let normX = 0.5;
let normY = 0.5;

function isDarkTheme(): boolean {
	const root = document.documentElement;
	if (root.classList.contains('theme-dark')) return true;
	if (root.classList.contains('theme-light')) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function accentColor(prop: (typeof ACCENT_VARS)[number], hue: number): string {
	const dark = isDarkTheme();
	switch (prop) {
		case '--accent':
			return `hsl(${hue} 75% 55%)`;
		case '--accent-soft':
			return dark ? `hsl(${hue} 50% 18%)` : `hsl(${hue} 80% 92%)`;
		case '--accent-deep':
			return `hsl(${hue} 75% 42%)`;
	}
}

function baseHueFromPosition(x: number, y: number): number {
	const cx = x - 0.5;
	const cy = y - 0.5;
	const angle = Math.atan2(cy, cx);
	return ((angle / (2 * Math.PI)) * 360 + 360) % 360;
}

function applyFromPosition(x: number, y: number): void {
	const baseHue = baseHueFromPosition(x, y);
	const root = document.documentElement;
	for (const prop of ACCENT_VARS) {
		const hue = (baseHue + ACCENT_PHASE_OFFSETS[prop]) % 360;
		root.style.setProperty(prop, accentColor(prop, hue));
	}
}

function scheduleApply(): void {
	if (rafId !== null) return;
	rafId = requestAnimationFrame(() => {
		rafId = null;
		if (!active) return;
		applyFromPosition(normX, normY);
	});
}

function activate(): void {
	if (active) return;
	active = true;
	document.documentElement.classList.add(RGB_CYCLE_CLASS);
	scheduleApply();
}

function deactivate(): void {
	if (!active) return;
	active = false;
	document.documentElement.classList.remove(RGB_CYCLE_CLASS);
	const root = document.documentElement;
	for (const prop of ACCENT_VARS) {
		root.style.removeProperty(prop);
	}
}

function onPointerMove(e: PointerEvent): void {
	normX = e.clientX / Math.max(window.innerWidth, 1);
	normY = e.clientY / Math.max(window.innerHeight, 1);
	if (!active) activate();
	scheduleApply();
}

function onPointerLeave(): void {
	deactivate();
}

function initPositionAccentEgg(): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	document.addEventListener('pointermove', onPointerMove, { passive: true });
	document.addEventListener('pointerleave', onPointerLeave);
}

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initPositionAccentEgg, { once: true });
	} else {
		initPositionAccentEgg();
	}
}
