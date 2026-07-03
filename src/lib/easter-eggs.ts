const AWESOME = 'awesome';
const BUFFER_RESET_MS = 2500;
const RGB_CYCLE_CLASS = 'accent-rgb-cycle';

function isTypingInTextField(): boolean {
	const el = document.activeElement;
	if (!el) return false;
	const tag = el.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	return el instanceof HTMLElement && el.isContentEditable;
}

function initAwesomeEasterEgg(): void {
	let buffer = '';
	let resetTimer: ReturnType<typeof setTimeout> | null = null;

	const clearBuffer = () => {
		buffer = '';
		if (resetTimer !== null) {
			clearTimeout(resetTimer);
			resetTimer = null;
		}
	};

	const toggleRgbCycle = () => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		document.documentElement.classList.toggle(RGB_CYCLE_CLASS);
	};

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
