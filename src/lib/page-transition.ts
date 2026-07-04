const FADE_MS = 420;
const REVEAL_MS = 1350;
let initialized = false;

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getHost(): HTMLElement {
	let host = document.querySelector('.page-transition-host');
	if (!(host instanceof HTMLElement)) {
		host = document.createElement('div');
		host.className = 'page-transition-host';
		host.setAttribute('aria-hidden', 'true');
		document.body.appendChild(host);
	}
	return host;
}

function getOverlay(): HTMLElement {
	const host = getHost();
	let overlay = host.querySelector('.page-transition');
	if (!(overlay instanceof HTMLElement)) {
		overlay = document.createElement('div');
		overlay.className = 'page-transition';
		host.appendChild(overlay);
	}
	return overlay;
}

function resetOverlay(overlay: HTMLElement): void {
	overlay.classList.remove(
		'page-transition--active',
		'page-transition--fade-out',
		'page-transition--reveal',
	);
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

function waitForAnimation(el: Element, fallbackMs: number): Promise<void> {
	return new Promise((resolve) => {
		const done = () => resolve();
		el.addEventListener('animationend', done, { once: true });
		window.setTimeout(done, fallbackMs);
	});
}

async function fadeOut(): Promise<void> {
	const overlay = getOverlay();
	resetOverlay(overlay);
	overlay.classList.add('page-transition--active', 'page-transition--fade-out');
	await waitForAnimation(overlay, FADE_MS + 80);
}

async function revealIn(): Promise<void> {
	const overlay = getOverlay();
	overlay.classList.remove('page-transition--fade-out');
	overlay.classList.add('page-transition--reveal');
	await waitForAnimation(overlay, REVEAL_MS + 120);
	resetOverlay(overlay);
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

	document.addEventListener('astro:after-swap', () => {
		void revealIn();
	});
}
