import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import ThemeToggle from './ThemeToggle';

const MOBILE_BREAKPOINT = 768;
const TOP_THRESHOLD = 24;

interface NavLink {
  href: string;
  label: string;
  isActive: boolean;
}

interface FloatingNavProps {
  links: NavLink[];
  isHomeActive?: boolean;
}

const TRANSITION_DURATION_MS = 280;

export default function FloatingNav({ links, isHomeActive = false }: FloatingNavProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [mobileBarCollapsed, setMobileBarCollapsed] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const [slideUp, setSlideUp] = useState(false);
  const [circleSlideUp, setCircleSlideUp] = useState(false);
  const [transitioningToCircle, setTransitioningToCircle] = useState(false);
  const [transitioningToBar, setTransitioningToBar] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevAtTopRef = useRef(true);
  const isTransitioningRef = useRef(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mouseNearTop, setMouseNearTop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isNavCramped, setIsNavCramped] = useState(false);
  const navInnerRef = useRef<HTMLElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);

  const checkNavCramped = useCallback(() => {
    const inner = navInnerRef.current;
    const linksEl = navLinksRef.current;
    if (!inner || !linksEl) return;

    const isMobileView = window.innerWidth <= MOBILE_BREAKPOINT;
    const themeInBar = inner.querySelector('.floating-nav-theme-in-bar .theme-toggle');
    const themeWidth = themeInBar?.getBoundingClientRect().width ?? 0;

    const cramped = isMobileView
      ? linksEl.scrollWidth > linksEl.clientWidth + 2 ||
        (!!themeInBar && linksEl.scrollWidth + themeWidth > linksEl.clientWidth + 2)
      : inner.scrollWidth + (themeInBar ? themeWidth + 8 : 0) > window.innerWidth - 48;

    setIsNavCramped((prev) => {
      if (cramped) return true;
      if (!prev) return false;
      if (isMobileView) {
        return linksEl.scrollWidth > linksEl.clientWidth - 40;
      }
      return inner.scrollWidth > window.innerWidth - 96;
    });
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const triggerCollapseTransition = useCallback(() => {
    isTransitioningRef.current = true;
    setTransitioningToCircle(true);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setTransitioningToCircle(false);
      setForceExpanded(false);
      setMobileBarCollapsed(true);
      setCircleSlideUp(true);
      isTransitioningRef.current = false;
      transitionTimeoutRef.current = setTimeout(() => {
        setCircleSlideUp(false);
        transitionTimeoutRef.current = null;
      }, TRANSITION_DURATION_MS);
    }, TRANSITION_DURATION_MS);
  }, []);

  const triggerExpandTransition = useCallback(() => {
    isTransitioningRef.current = true;
    setTransitioningToBar(true);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setTransitioningToBar(false);
      setForceExpanded(true);
      setMobileBarCollapsed(false);
      setSlideUp(true);
      isTransitioningRef.current = false;
      transitionTimeoutRef.current = setTimeout(() => {
        setSlideUp(false);
        transitionTimeoutRef.current = null;
      }, TRANSITION_DURATION_MS);
    }, TRANSITION_DURATION_MS);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const atTop = currentScrollY <= TOP_THRESHOLD;
      const wasAtTop = prevAtTopRef.current;
      prevAtTopRef.current = atTop;
      setIsAtTop(atTop);

      if (isMobile) {
        if (isTransitioningRef.current) return;
        if (wasAtTop && !atTop) {
          triggerCollapseTransition();
        } else if (!wasAtTop && atTop) {
          triggerExpandTransition();
        }
        return;
      }

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobile, triggerCollapseTransition, triggerExpandTransition]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMouseNearTop(e.clientY < 100);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  const mobileCollapsed = isMobile && !forceExpanded && (mobileBarCollapsed || !isAtTop);
  const desktopVisible = !isHidden || mouseNearTop;

  const showBar = !mobileCollapsed || transitioningToCircle;
  const showCircle = mobileCollapsed || transitioningToBar;
  const themeBesideMenu = isMobile && mobileCollapsed;

  useLayoutEffect(() => {
    if (!showBar) return;

    let frame = 0;
    const scheduleCheck = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        checkNavCramped();
      });
    };

    scheduleCheck();
    const inner = navInnerRef.current;
    const linksEl = navLinksRef.current;
    if (!inner || !linksEl) return;

    const observer = new ResizeObserver(scheduleCheck);
    observer.observe(inner);
    observer.observe(linksEl);
    window.addEventListener('resize', scheduleCheck);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', scheduleCheck);
    };
  }, [showBar, links.length, checkNavCramped]);

  const handleCircleClick = () => triggerExpandTransition();
  const handleHamburgerClick = () => triggerCollapseTransition();

  const HamburgerIcon = () => (
    <>
      <span className="floating-nav-hamburger-line" />
      <span className="floating-nav-hamburger-line" />
      <span className="floating-nav-hamburger-line" />
    </>
  );

  return (
    <>
      <header
        className="floating-nav"
        data-collapsed={mobileCollapsed}
        data-nav-cramped={isNavCramped}
        data-desktop-hidden={!desktopVisible}
      >
        {/* Mobile: circle (collapsed) or bar (expanded); use transition states to animate */}
        {showCircle ? (
          themeBesideMenu ? (
            <div
              className={`floating-nav-collapsed-group${transitioningToBar ? ' floating-nav-collapsed-group--slide-down' : circleSlideUp ? ' floating-nav-collapsed-group--slide-up' : ''}`}
            >
              <ThemeToggle />
              <button
                type="button"
                onClick={transitioningToBar ? undefined : handleCircleClick}
                aria-label="Open menu"
                className="floating-nav-collapsed-btn floating-nav-collapsed-btn--plain"
              >
                <HamburgerIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={transitioningToBar ? undefined : handleCircleClick}
              aria-label="Open menu"
              className={`floating-nav-collapsed-btn${transitioningToBar ? ' floating-nav-collapsed-btn--slide-down' : circleSlideUp ? ' floating-nav-collapsed-btn--slide-up' : ''}`}
            >
              <HamburgerIcon />
            </button>
          )
        ) : (
          <div className="floating-nav-bar-wrap">
            <nav
              ref={navInnerRef}
              className={`floating-nav-inner${transitioningToCircle ? ' floating-nav-inner--slide-down' : slideUp ? ' floating-nav-inner--slide-up' : ''}`}
            >
              <a
                href="/"
                className={`nav-link nav-logo${isHomeActive ? ' active' : ''}`}
                style={{ color: isHomeActive ? 'var(--accent)' : 'var(--text)' }}
              >
                <span className="nav-logo-long">Mason Trout</span>
                <span className="nav-logo-short">MT</span>
              </a>

              <div ref={navLinksRef} className="nav-links">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`nav-link${link.isActive ? ' active' : ''}`}
                    style={{
                      color: link.isActive ? 'var(--accent)' : 'var(--text)',
                      fontWeight: link.isActive ? 600 : 400,
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="floating-nav-actions">
                <div className="floating-nav-theme-in-bar">
                  <ThemeToggle />
                </div>
                <button
                  type="button"
                  onClick={transitioningToCircle ? undefined : handleHamburgerClick}
                  aria-label="Collapse menu"
                  className="floating-nav-hamburger"
                >
                  <HamburgerIcon />
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
