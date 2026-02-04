import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

interface NavLink {
  href: string;
  label: string;
  isActive: boolean;
}

interface FloatingNavProps {
  links: NavLink[];
}

export default function FloatingNav({ links }: FloatingNavProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mouseNearTop, setMouseNearTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Show nav when mouse is near the top
      setMouseNearTop(e.clientY < 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [lastScrollY]);

  return (
    <header
      style={{
        position: 'fixed',
        top: isHidden && !mouseNearTop ? '-3rem' : '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
        width: 'fit-content',
      }}
    >
      <nav
        style={{
          background: 'var(--card)',
          border: '2px solid var(--border)',
          borderRadius: '999px',
          padding: '0.6rem 1.5rem',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <a
          href="/"
          style={{
            fontWeight: 700,
            fontSize: '1.1rem',
            color: 'var(--text)',
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
        >
          Portfolio
        </a>

        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
          }}
          className="nav-links-desktop"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`nav-link${link.isActive ? ' active' : ''}`}
              style={{
                color: link.isActive ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                fontWeight: link.isActive ? 600 : 400,
                fontSize: '0.95rem',
                transition: 'color 0.2s ease',
                position: 'relative',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="nav-toggle-mobile"
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
          }}
          aria-label="Toggle navigation"
        >
          <span style={{ width: '20px', height: '2px', background: 'var(--text)', display: 'block', borderRadius: '2px' }} />
          <span style={{ width: '20px', height: '2px', background: 'var(--text)', display: 'block', borderRadius: '2px' }} />
          <span style={{ width: '20px', height: '2px', background: 'var(--text)', display: 'block', borderRadius: '2px' }} />
        </button>

        <ThemeToggle />
      </nav>

      {/* Mobile dropdown menu */}
      {isOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--card)',
            border: '2px solid var(--border)',
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            minWidth: '200px',
          }}
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: link.isActive ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                fontWeight: link.isActive ? 600 : 400,
                fontSize: '0.95rem',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                transition: 'background 0.2s ease',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
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
          .nav-links-desktop {
            display: none !important;
          }
          .nav-toggle-mobile {
            display: flex !important;
          }
        }
        .mobile-menu a:hover {
          background: var(--border);
        }
      `}</style>
    </header>
  );
}
