import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  Sparkles,
  LayoutDashboard,
  PlusCircle,
  History,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Zap,
} from 'lucide-react';

export default function Navbar({ isAppView = false, onToggleMobileSidebar = null }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isLanding = location.pathname === '/';

  return (
    <nav className="navbar" id="main-navbar">
      {/* Left: Mobile sidebar toggle button for App view or Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isAppView && onToggleMobileSidebar && (
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onToggleMobileSidebar}
            style={{ display: 'none', padding: 0 }}
            aria-label="Toggle Navigation"
            id="mobile-sidebar-toggle"
          >
            <Menu size={18} />
          </button>
        )}

        <Link
          to={user ? '/dashboard' : '/'}
          className="navbar-brand"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'var(--gradient-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)',
            }}
          >
            <Zap size={18} fill="#ffffff" stroke="none" />
          </div>
          <span>
            Interview<span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </Link>
      </div>

      {/* Middle: Landing page navigational links if on public page */}
      {!user && isLanding && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '32px',
          }}
          className="desktop-nav-links"
        >
          <a href="#features" className="nav-link">
            Features
          </a>
          <a href="#how-it-works" className="nav-link">
            How It Works
          </a>
          <a href="#preview" className="nav-link">
            Mockup
          </a>
        </div>
      )}

      {/* Right Desktop Actions */}
      <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Theme toggle always present */}
        <ThemeToggle />

        {user ? (
          <>
            <Link
              to="/interview/new"
              className="btn btn-primary btn-sm desktop-only-btn"
              style={{ gap: '6px' }}
              id="nav-quick-new"
            >
              <PlusCircle size={15} />
              <span>Start Practice</span>
            </Link>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 6px 4px 12px',
                background: 'var(--bg-elevated)',
                borderRadius: '999px',
                border: '1px solid var(--border)',
              }}
              className="desktop-user-pill"
            >
              <Link
                to="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--gradient-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                >
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name?.split(' ')[0] || 'User'}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost btn-sm"
                style={{
                  padding: '4px 8px',
                  height: '28px',
                  borderRadius: '999px',
                  color: 'var(--text-muted)',
                }}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link to="/login" className="btn btn-ghost btn-sm">
              Log In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
              <span>Get Started</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Mobile Hamburger toggle */}
        <button
          type="button"
          className="btn btn-secondary btn-icon mobile-menu-button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'none' }}
          aria-label="Open mobile menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '68px',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-popover)',
            zIndex: 998,
          }}
        >
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--gradient-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                >
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
              </div>
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="sidebar-item">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <Link to="/interview/new" onClick={() => setMobileMenuOpen(false)} className="sidebar-item">
                <PlusCircle size={18} /> New Interview
              </Link>
              <Link to="/history" onClick={() => setMobileMenuOpen(false)} className="sidebar-item">
                <History size={18} /> Interview History
              </Link>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="sidebar-item">
                <User size={18} /> Profile & Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-danger btn-sm"
                style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
              >
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              {isLanding && (
                <>
                  <a href="#features" onClick={() => setMobileMenuOpen(false)} className="sidebar-item">
                    Features
                  </a>
                  <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="sidebar-item">
                    How It Works
                  </a>
                </>
              )}
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
                Log In
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                Get Started Free
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
