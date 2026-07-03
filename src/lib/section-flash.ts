function headingLevel(el: Element): number {
	return Number.parseInt(el.tagName[1], 10);
}

function sectionBottom(heading: HTMLElement, tocHeadings: HTMLElement[]): number {
	const level = headingLevel(heading);
	const idx = tocHeadings.indexOf(heading);
	for (let i = idx + 1; i < tocHeadings.length; i++) {
		if (headingLevel(tocHeadings[i]) <= level) {
			return tocHeadings[i].getBoundingClientRect().top + window.scrollY;
		}
	}

	const content = heading.closest('.post-content');
	if (content instanceof HTMLElement) {
		return content.getBoundingClientRect().bottom + window.scrollY;
	}

	return heading.getBoundingClientRect().bottom + window.scrollY;
}

/** Sweep an orange highlight across the full width of a post section. */
export function flashSection(heading: HTMLElement, tocHeadings: HTMLElement[]): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const top = heading.getBoundingClientRect().top + window.scrollY;
	const bottom = sectionBottom(heading, tocHeadings);
	const height = Math.max(bottom - top, heading.getBoundingClientRect().height);

	document.querySelector('.section-flash')?.remove();

	const overlay = document.createElement('div');
	overlay.className = 'section-flash';
	overlay.style.top = `${top}px`;
	overlay.style.height = `${height}px`;

	const wave = document.createElement('div');
	wave.className = 'section-flash__wave';
	wave.setAttribute('aria-hidden', 'true');
	overlay.appendChild(wave);

	document.body.appendChild(overlay);

	const remove = () => overlay.remove();
	wave.addEventListener('animationend', remove, { once: true });
	window.setTimeout(remove, 2000);
}

export function flashSectionAfterScroll(
	headingId: string,
	content: Element,
	tocHeadings: HTMLElement[],
): void {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			const heading = content.querySelector(`#${CSS.escape(headingId)}`);
			if (heading instanceof HTMLElement) flashSection(heading, tocHeadings);
		});
	});
}
