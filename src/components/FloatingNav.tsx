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
  const themeBesideMenu = isNavCramped && mobileCollapsed;

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

      <style>{`
        .floating-nav {
          position: fixed;
          z-index: 50;
          transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .floating-nav-bar-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .floating-nav-inner {
          background: var(--card);
          border: 2px solid var(--border);
          border-radius: 999px;
          padding: 0.6rem 1.5rem;
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          gap: 1.5rem;
          transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-logo {
          font-weight: 700;
          font-size: 1.1rem;
          text-decoration: none;
          transition: color 0.2s ease;
          flex-shrink: 0;
          position: relative;
        }

        .nav-logo-short {
          display: none;
        }

        .nav-links {
          display: flex;
          gap: 1.5rem;
          align-items: center;
          flex: none;
          min-width: 0;
        }

        .nav-link {
          color: var(--text);
          text-decoration: none;
          font-weight: 400;
          font-size: 0.95rem;
          transition: color 0.2s ease;
          position: relative;
        }

        .floating-nav-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .floating-nav-hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.35rem;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .floating-nav-hamburger-line {
          width: 18px;
          height: 2px;
          background: var(--text);
          display: block;
          border-radius: 2px;
        }

        .floating-nav-collapsed-group {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
          border-radius: 999px;
          border: 2px solid var(--border);
          background: var(--card);
          backdrop-filter: blur(10px);
          padding: 0.35rem 0.5rem 0.35rem 0.35rem;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }

        .floating-nav-collapsed-btn {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 50%;
          border: 2px solid var(--border);
          background: var(--card);
          backdrop-filter: blur(10px);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          flex-shrink: 0;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }

        .floating-nav-collapsed-btn--plain {
          width: auto;
          height: auto;
          border: none;
          background: none;
          box-shadow: none;
          border-radius: 0;
          padding: 0.35rem;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -0.5rem;
          height: 2px;
          background: var(--accent);
          border-radius: 999px;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.2s ease;
        }

        .nav-link:hover::after,
        .nav-link.active::after {
          transform: scaleX(1);
        }

        @media (max-width: 768px) {
          .floating-nav {
            left: 0;
            right: 0;
            bottom: var(--mobile-nav-bottom);
            top: auto;
            display: flex;
            justify-content: center;
            padding-left: max(1rem, env(safe-area-inset-left));
            padding-right: max(1rem, env(safe-area-inset-right));
          }

          .floating-nav[data-collapsed='true'] {
            justify-content: flex-end;
          }

          .floating-nav-bar-wrap {
            width: 100%;
            max-width: min(100%, 560px);
          }

          .floating-nav-inner {
            width: 100%;
            max-width: min(100%, 560px);
            justify-content: space-between;
            min-width: 0;
            padding: 0.6rem 1rem;
            gap: 1rem;
          }

          .floating-nav[data-nav-cramped='true'] .floating-nav-inner {
            flex: 1;
            width: auto;
            max-width: none;
          }

          .nav-logo {
            font-size: 1.05rem;
          }

          .nav-logo-long {
            display: none;
          }

          .nav-logo-short {
            display: inline;
          }

          .nav-links {
            display: flex !important;
            gap: 1rem;
            flex: 1;
            justify-content: center;
          }

          .nav-link {
            font-size: 0.9rem;
          }

          .floating-nav-hamburger {
            display: flex;
          }

          .floating-nav[data-nav-cramped='true'] .floating-nav-theme-in-bar {
            display: none;
          }

          .floating-nav-inner--slide-up {
            animation: floating-nav-slide-up 0.28s ease-out forwards;
          }

          .floating-nav-inner--slide-down {
            animation: floating-nav-slide-down 0.28s ease-out forwards;
          }

          .floating-nav-collapsed-btn--slide-up {
            animation: floating-nav-slide-up 0.28s ease-out forwards;
          }

          .floating-nav-collapsed-btn--slide-down {
            animation: floating-nav-slide-down 0.28s ease-out forwards;
          }

          .floating-nav-collapsed-group--slide-up {
            animation: floating-nav-slide-up 0.28s ease-out forwards;
          }

          .floating-nav-collapsed-group--slide-down {
            animation: floating-nav-slide-down 0.28s ease-out forwards;
          }
        }

        @media (min-width: 769px) {
          .floating-nav {
            left: 50%;
            transform: translateX(-50%);
            top: 1rem;
            bottom: auto;
            width: fit-content;
            display: flex;
          }

          .floating-nav[data-desktop-hidden='true'] {
            top: -3rem;
          }
        }

        @keyframes floating-nav-slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes floating-nav-slide-down {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(100%);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
