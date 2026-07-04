const OVERLAY_ROOT_ID = 'page-transition-root';
const FADE_MS = 380;
const REVEAL_MS = 780;

let initialized = false;
let transitioning = false;
let hostEl: HTMLElement | null = null;
let overlayEl: HTMLElement | null = null;
let curtainEl: HTMLElement | null = null;

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ensureOverlay(): {
	overlay: HTMLElement;
	curtain: HTMLElement;
} {
	if (!hostEl) {
		hostEl = document.createElement('div');
		hostEl.id = OVERLAY_ROOT_ID;
		hostEl.className = 'page-transition-host';
		hostEl.setAttribute('aria-hidden', 'true');

		overlayEl = document.createElement('div');
		overlayEl.className = 'page-transition';

		curtainEl = document.createElement('div');
		curtainEl.className = 'page-transition__curtain';
		overlayEl.appendChild(curtainEl);
		hostEl.appendChild(overlayEl);
	}

	if (!overlayEl || !curtainEl) {
		throw new Error('Page transition overlay failed to initialize');
	}

	if (!hostEl.isConnected) {
		document.body.appendChild(hostEl);
	}

	return { overlay: overlayEl, curtain: curtainEl };
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
	const { overlay, curtain } = ensureOverlay();
	resetTransition(overlay, curtain);
	transitioning = true;
	overlay.classList.add('page-transition--active', 'page-transition--fade-out');
	await waitForAnimation(curtain, 'page-transition-fade-out', FADE_MS + 60);
	lockCovered(overlay, curtain);
}

async function revealIn(): Promise<void> {
	if (!overlayEl || !curtainEl || !hostEl || !transitioning) return;

	lockCovered(overlayEl, curtainEl);
	overlayEl.classList.add('page-transition--reveal');
	await waitForAnimation(curtainEl, 'page-transition-reveal', REVEAL_MS + 80);
	resetTransition(overlayEl, curtainEl);
}

function preserveOverlayThroughSwap(event: TransitionBeforeSwapEvent): void {
	if (!transitioning || !hostEl) return;

	const savedHost = hostEl;
	const { overlay, curtain } = ensureOverlay();
	lockCovered(overlay, curtain);

	const runSwap = event.swap;
	event.swap = () => {
		savedHost.remove();
		runSwap();
		document.body.prepend(savedHost);
		lockCovered(overlay, curtain);
	};
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
		if (!transitioning || !overlayEl || !curtainEl) return;
		lockCovered(overlayEl, curtainEl);
	});

	document.addEventListener('astro:before-swap', (event) => {
		event.viewTransition?.skipTransition();
		preserveOverlayThroughSwap(event);
	});

	document.addEventListener('astro:after-swap', () => {
		if (!transitioning) return;
		void revealIn();
	});
}

type TransitionBeforeSwapEvent = Event & {
	swap: () => void;
	viewTransition?: { skipTransition?: () => void };
};
