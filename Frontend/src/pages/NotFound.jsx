import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Compass, Home, LayoutDashboard, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(80px, 14vw, 150px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            marginBottom: '16px',
          }}
          className="text-gradient"
        >
          404
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>
          Page Not Found
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '16px',
            maxWidth: '460px',
            marginBottom: '32px',
            lineHeight: 1.6,
          }}
        >
          The practice session or page you are looking for has been moved or doesn't exist.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-secondary" style={{ gap: '8px' }}>
            <Home size={16} /> Home
          </Link>
          <Link to="/dashboard" className="btn btn-primary" style={{ gap: '8px' }}>
            <LayoutDashboard size={16} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
