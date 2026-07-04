const OVERLAY_ROOT_ID = 'page-transition-root';
const FADE_MS = 380;
const REVEAL_MS = 780;
let initialized = false;
let transitioning = false;

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getElements(): {
	overlay: HTMLElement;
	curtain: HTMLElement;
} | null {
	const host = document.getElementById(OVERLAY_ROOT_ID);
	if (!(host instanceof HTMLElement)) return null;

	const overlay = host.querySelector('.page-transition');
	const curtain = overlay?.querySelector('.page-transition__curtain');
	if (!(overlay instanceof HTMLElement) || !(curtain instanceof HTMLElement)) return null;

	return { overlay, curtain };
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
	curtain.getAnimations().forEach((animation) => animation.cancel());
}

function lockCovered(overlay: HTMLElement, curtain: HTMLElement): void {
	overlay.classList.remove('page-transition--fade-out', 'page-transition--reveal');
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
	const elements = getElements();
	if (!elements) return;

	const { overlay, curtain } = elements;
	resetTransition(overlay, curtain);
	transitioning = true;
	overlay.classList.add('page-transition--active', 'page-transition--fade-out');
	await waitForAnimation(curtain, 'page-transition-fade-out', FADE_MS + 60);
	lockCovered(overlay, curtain);
}

async function revealIn(): Promise<void> {
	const elements = getElements();
	if (!elements || !transitioning) return;

	const { overlay, curtain } = elements;
	lockCovered(overlay, curtain);
	void curtain.offsetWidth;
	overlay.classList.add('page-transition--reveal');
	await waitForAnimation(curtain, 'page-transition-reveal', REVEAL_MS + 80);
	resetTransition(overlay, curtain);
}

function skipBrowserViewTransition(event: Event): void {
	if (!('viewTransition' in event)) return;
	const viewTransition = (event as { viewTransition?: { skipTransition?: () => void } }).viewTransition;
	viewTransition?.skipTransition?.();
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

	document.addEventListener('astro:after-preparation', () => {
		if (!transitioning) return;
		const elements = getElements();
		if (!elements) return;
		lockCovered(elements.overlay, elements.curtain);
	});

	document.addEventListener('astro:before-swap', (event) => {
		skipBrowserViewTransition(event);
		if (!transitioning) return;
		const elements = getElements();
		if (!elements) return;
		lockCovered(elements.overlay, elements.curtain);
	});

	document.addEventListener('astro:after-swap', () => {
		if (!transitioning) return;
		requestAnimationFrame(() => {
			void revealIn();
		});
	});
}
