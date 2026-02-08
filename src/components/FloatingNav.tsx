import { useEffect, useState, useRef, useCallback } from 'react';
import ThemeToggle from './ThemeToggle';

const MOBILE_BREAKPOINT = 768;
/** Below this viewport width on mobile, hide "MT" so nav links and toggle don't overlap */
const HIDE_NAME_BELOW_PX = 420;
const TOP_THRESHOLD = 24;

interface NavLink {
  href: string;
  label: string;
  isActive: boolean;
}

interface FloatingNavProps {
  links: NavLink[];
}

const TRANSITION_DURATION_MS = 280;

export default function FloatingNav({ links }: FloatingNavProps) {
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
  const [isMobile, setIsMobile] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false)
  );
  const [isAtTop, setIsAtTop] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [hideNameWhenTight, setHideNameWhenTight] = useState(
    () => (typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT && window.innerWidth < HIDE_NAME_BELOW_PX)
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsMobile(w <= MOBILE_BREAKPOINT);
      setHideNameWhenTight(w <= MOBILE_BREAKPOINT && w < HIDE_NAME_BELOW_PX);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
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

  const handleCircleClick = () => triggerExpandTransition();
  const handleHamburgerClick = () => triggerCollapseTransition();

  const linkStyle = {
    color: 'var(--text)',
    textDecoration: 'none' as const,
    fontWeight: 400,
    fontSize: '0.95rem',
    transition: 'color 0.2s ease',
    position: 'relative' as const,
  };

  const HamburgerIcon = () => (
    <>
      <span style={{ width: '18px', height: '2px', background: 'var(--text)', display: 'block', borderRadius: '2px' }} />
      <span style={{ width: '18px', height: '2px', background: 'var(--text)', display: 'block', borderRadius: '2px' }} />
      <span style={{ width: '18px', height: '2px', background: 'var(--text)', display: 'block', borderRadius: '2px' }} />
    </>
  );

  return (
    <>
      <header
        className="floating-nav"
        data-mobile={isMobile}
        data-collapsed={mobileCollapsed}
        style={
          !hasMounted
            ? undefined
            : isMobile
              ? { justifyContent: showCircle ? 'flex-end' : 'center' }
              : { top: !desktopVisible ? '-3rem' : '1rem' }
        }
      >
        {/* Mobile: circle (collapsed) or bar (expanded); use transition states to animate */}
        {showCircle ? (
          <button
            type="button"
            onClick={transitioningToBar ? undefined : handleCircleClick}
            aria-label="Open menu"
            className={`floating-nav-collapsed-btn${transitioningToBar ? ' floating-nav-collapsed-btn--slide-down' : circleSlideUp ? ' floating-nav-collapsed-btn--slide-up' : ''}`}
            style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '50%',
              border: '2px solid var(--border)',
              background: 'var(--card)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              flexShrink: 0,
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            }}
          >
            <HamburgerIcon />
          </button>
        ) : (
          <nav
            className={`floating-nav-inner${transitioningToCircle ? ' floating-nav-inner--slide-down' : isMobile && slideUp ? ' floating-nav-inner--slide-up' : ''}`}
            style={{
              background: 'var(--card)',
              border: '2px solid var(--border)',
              borderRadius: '999px',
              padding: isMobile ? '0.6rem 1rem' : '0.6rem 1.5rem',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '1rem' : '1.5rem',
              transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              ...(isMobile
                ? {
                    width: '100%',
                    maxWidth: 'min(100%, 560px)',
                    justifyContent: 'space-between',
                  }
                : {}),
            }}
          >
            {(!isMobile || !hideNameWhenTight) && (
              <a
                href="/"
                style={{
                  fontWeight: 700,
                  fontSize: isMobile ? '1.05rem' : '1.1rem',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {isMobile ? 'MT' : 'Mason Trout'}
              </a>
            )}

            <div
              style={{
                display: 'flex',
                gap: isMobile ? '1rem' : '1.5rem',
                alignItems: 'center',
                flex: isMobile ? 1 : 'none',
                justifyContent: isMobile ? 'center' : undefined,
                minWidth: 0,
              }}
              className="nav-links"
            >
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`nav-link${link.isActive ? ' active' : ''}`}
                  style={{
                    ...linkStyle,
                    color: link.isActive ? 'var(--accent)' : 'var(--text)',
                    fontWeight: link.isActive ? 600 : 400,
                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <ThemeToggle />
              {isMobile && (
                <button
                  type="button"
                  onClick={transitioningToCircle ? undefined : handleHamburgerClick}
                  aria-label="Collapse menu"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <HamburgerIcon />
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      <style>{`
        /* Base positioning via media queries — correct from first paint, no JS-dependent jump */
        .floating-nav {
          position: fixed;
          z-index: 50;
          transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
          .nav-links {
            display: flex !important;
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
