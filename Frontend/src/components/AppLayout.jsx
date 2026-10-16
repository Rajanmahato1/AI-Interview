import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  User,
  LogOut,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function AppLayout({ children, activeTitle = '', actions = null }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'New Interview', icon: PlusCircle, path: '/interview/new' },
    { label: 'Interview History', icon: History, path: '/history' },
    { label: 'Profile & Settings', icon: User, path: '/profile' },
  ];

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar
        isAppView={true}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Backdrop for mobile sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 49,
          }}
        />
      )}

      {/* App Sidebar */}
      <aside
        className={`app-sidebar ${mobileSidebarOpen ? 'open' : ''}`}
        id="app-sidebar"
      >
        <div style={{ marginBottom: '20px', padding: '0 4px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: '10px',
            }}
          >
            Practice Workspace
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Quick Upgrade / AI Status Card in Sidebar */}
        <div
          className="card"
          style={{
            marginTop: 'auto',
            marginBottom: '16px',
            padding: '16px',
            background: 'var(--bg-elevated)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} color="var(--accent-light)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              AI Model Active
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>
            Multi-LLM pipeline ready for technical & behavioral coaching.
          </p>
          <NavLink
            to="/interview/new"
            className="btn btn-primary btn-sm"
            style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
          >
            Practice Now
          </NavLink>
        </div>

        {/* User Card at bottom of sidebar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--gradient-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'User'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email || ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', color: 'var(--danger)', borderRadius: '8px' }}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}
