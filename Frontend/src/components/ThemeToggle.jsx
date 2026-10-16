import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '', style = {} }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn btn-secondary btn-icon ${className}`}
      style={{
        borderRadius: '10px',
        width: '38px',
        height: '38px',
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
        color: isDark ? '#fbbf24' : '#7c3aed',
        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(124, 58, 237, 0.06)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ...style,
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      id="theme-toggle-btn"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s',
          transform: isDark ? 'rotate(0deg)' : 'rotate(90deg)',
        }}
      >
        {isDark ? <Sun size={18} strokeWidth={2.2} /> : <Moon size={18} strokeWidth={2.2} />}
      </div>
    </button>
  );
}
