import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '120px', fontWeight: 800, background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: '28px', marginTop: '16px', marginBottom: '8px' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>The page you're looking for doesn't exist or has been moved.</p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Link to="/" className="btn btn-secondary">Go Home</Link>
        <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
      </div>
    </div>
  );
}
