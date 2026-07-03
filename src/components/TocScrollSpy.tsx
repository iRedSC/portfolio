import { useEffect } from 'react';
import { flashSectionAfterScroll } from '../lib/section-flash';

const MOBILE_TOC_MQ = '(max-width: 900px)';

function offsetPx(): number {
	const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
	/* Align with sticky `.post-toc { top: 6rem }` plus a small buffer */
	return rootFont * 6.5;
}

/** While set, prefer this id if its heading is still plausibly the focused section (after a click or hash). */
function pinnedInPlay(el: HTMLElement): boolean {
	const r = el.getBoundingClientRect();
	const vh = window.innerHeight;
	if (r.bottom < 0) return false;
	if (r.top > vh) return false;
	if (r.top < -120) return false;
	return true;
}

export default function TocScrollSpy() {
	useEffect(() => {
		const toc = document.querySelector('.post-toc');
		if (!toc) return;
		const postBody = toc.closest('.post-body');
		const content = postBody?.querySelector('.post-content');
		if (!content) return;

		const disclosure = toc.querySelector('.post-toc-disclosure');
		const currentLabel = toc.querySelector('.post-toc-current');
		const mobileMq = window.matchMedia(MOBILE_TOC_MQ);

		const links = [...toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
		if (links.length === 0) return;

		const headings: HTMLElement[] = [];
		const idSet = new Set<string>();
		for (const link of links) {
			const id = decodeURIComponent(link.hash.slice(1));
			if (!id) continue;
			const el = content.querySelector(`#${CSS.escape(id)}`);
			if (el instanceof HTMLElement) {
				headings.push(el);
				idSet.add(id);
			}
		}
		if (headings.length === 0) return;

		let pinnedId: string | null = null;

		const syncPinFromHash = () => {
			const id = decodeURIComponent(location.hash.slice(1));
			if (id && idSet.has(id)) pinnedId = id;
		};
		syncPinFromHash();

		const setActive = (activeId: string | null) => {
			let activeText = '';
			for (const link of links) {
				const id = decodeURIComponent(link.hash.slice(1));
				const li = link.closest('li');
				if (id === activeId) {
					link.setAttribute('aria-current', 'location');
					li?.classList.add('toc-active');
					activeText = link.textContent?.trim() ?? '';
				} else {
					link.removeAttribute('aria-current');
					li?.classList.remove('toc-active');
				}
			}
			if (currentLabel) currentLabel.textContent = activeText;
		};

		let ticking = false;
		const update = () => {
			ticking = false;
			const offset = offsetPx();

			if (pinnedId) {
				const pinnedEl = content.querySelector(`#${CSS.escape(pinnedId)}`);
				if (pinnedEl instanceof HTMLElement && pinnedInPlay(pinnedEl)) {
					setActive(pinnedId);
					return;
				}
				pinnedId = null;
			}

			const docH = document.documentElement.scrollHeight;
			const shortPage = docH <= window.innerHeight + 8;
			const nearBottom =
				!shortPage && window.scrollY + window.innerHeight >= docH - 2;

			let activeId: string | null = null;
			if (nearBottom) {
				activeId = headings[headings.length - 1]?.id ?? null;
			} else {
				for (const h of headings) {
					if (h.getBoundingClientRect().top <= offset) activeId = h.id;
				}
				if (activeId === null) activeId = headings[0]?.id ?? null;
			}
			setActive(activeId);
		};

		const schedule = () => {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(update);
			}
		};

		const closeMobileDisclosure = () => {
			if (mobileMq.matches && disclosure instanceof HTMLDetailsElement) {
				disclosure.open = false;
			}
		};

		const onTocClick = (e: MouseEvent) => {
			const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
			if (!a || !toc.contains(a)) return;
			const id = decodeURIComponent((a as HTMLAnchorElement).hash.slice(1));
			if (idSet.has(id)) {
				pinnedId = id;
				schedule();
				closeMobileDisclosure();
				flashSectionAfterScroll(id, content, headings);
			}
		};

		const onHashChange = () => {
			syncPinFromHash();
			schedule();
		};

		toc.addEventListener('click', onTocClick);
		update();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		window.addEventListener('hashchange', onHashChange);
		const ro = new ResizeObserver(schedule);
		ro.observe(content);

		return () => {
			toc.removeEventListener('click', onTocClick);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			window.removeEventListener('hashchange', onHashChange);
			ro.disconnect();
			setActive(null);
		};
	}, []);

	return null;
}
