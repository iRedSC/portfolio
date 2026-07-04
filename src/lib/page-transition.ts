const FADE_MS = 380;
const REVEAL_MS = 780;
let initialized = false;
let transitioning = false;

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getOverlay(): HTMLElement | null {
	const overlay = document.querySelector('.page-transition');
	return overlay instanceof HTMLElement ? overlay : null;
}

function getCurtain(overlay: HTMLElement): HTMLElement | null {
	const curtain = overlay.querySelector('.page-transition__curtain');
	return curtain instanceof HTMLElement ? curtain : null;
}

function resetTransition(overlay: HTMLElement, curtain: HTMLElement): void {
	transitioning = false;
	overlay.classList.remove(
		'page-transition--active',
		'page-transition--fade-out',
		'page-transition--covered',
		'page-transition--reveal',
	);
	curtain.style.opacity = '';
	curtain.style.removeProperty('-webkit-mask-image');
	curtain.style.removeProperty('mask-image');
	curtain.style.removeProperty('-webkit-mask-size');
	curtain.style.removeProperty('mask-size');
	curtain.style.removeProperty('-webkit-mask-position');
	curtain.style.removeProperty('mask-position');
}

function lockCovered(overlay: HTMLElement, curtain: HTMLElement): void {
	overlay.classList.remove('page-transition--fade-out');
	overlay.classList.add('page-transition--active', 'page-transition--covered');
	curtain.style.opacity = '1';
}

function waitForAnimation(el: Element, animationName: string, fallbackMs: number): Promise<void> {
	return new Promise((resolve) => {
		const done = () => resolve();
		const onEnd = (event: AnimationEvent) => {
			if (event.target !== el || event.animationName !== animationName) return;
			el.removeEventListener('animationend', onEnd);
			done();
		};
		el.addEventListener('animationend', onEnd);
		window.setTimeout(done, fallbackMs);
	});
}

async function fadeOut(): Promise<void> {
	const overlay = getOverlay();
	const curtain = overlay ? getCurtain(overlay) : null;
	if (!overlay || !curtain) return;

	resetTransition(overlay, curtain);
	transitioning = true;
	overlay.classList.add('page-transition--active', 'page-transition--fade-out');
	await waitForAnimation(curtain, 'page-transition-fade-out', FADE_MS + 60);
	lockCovered(overlay, curtain);
}

async function revealIn(): Promise<void> {
	const overlay = getOverlay();
	const curtain = overlay ? getCurtain(overlay) : null;
	if (!overlay || !curtain || !transitioning) return;

	lockCovered(overlay, curtain);
	void curtain.offsetWidth;
	overlay.classList.add('page-transition--reveal');
	await waitForAnimation(curtain, 'page-transition-reveal', REVEAL_MS + 80);
	resetTransition(overlay, curtain);
}

export function initPageTransition(): void {
	if (initialized || prefersReducedMotion()) return;
	initialized = true;

	document.addEventListener('astro:before-preparation', (event) => {
		const originalLoader = event.loader;
		event.loader = async function (this: unknown, ...args: unknown[]) {
			await fadeOut();
			await originalLoader.apply(this, args);
		};
	});

	document.addEventListener('astro:before-swap', () => {
		const overlay = getOverlay();
		const curtain = overlay ? getCurtain(overlay) : null;
		if (!overlay || !curtain || !transitioning) return;
		lockCovered(overlay, curtain);
	});

	document.addEventListener('astro:after-swap', () => {
		void revealIn();
	});
}
