import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { Mail, ArrowLeft, Zap, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
      toast.success('Password reset link sent to your email!');
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '450px',
          background: 'var(--gradient-hero-overlay)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header */}
      <header
        style={{
          padding: '20px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
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
            }}
          >
            <Zap size={18} fill="#ffffff" stroke="none" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Interview<span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />
          <Link to="/login" className="btn btn-ghost btn-sm" style={{ gap: '6px' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </header>

      {/* Center Card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '36px',
            boxShadow: 'var(--shadow-card-hover)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--border-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--accent)',
              }}
            >
              <Mail size={26} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
              Reset Password
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Enter your email and we'll send reset instructions.
            </p>
          </div>

          {sent ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                Check Your Inbox
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '20px' }}>
                We sent a secure password reset link to <strong>{email}</strong>.
              </p>
              <Link to="/login" className="btn btn-secondary btn-sm w-full" style={{ justifyContent: 'center' }}>
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">
                  Account Email Address
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  id="forgot-email"
                  required
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
                style={{ justifyContent: 'center' }}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                    <span>Sending Instructions...</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <Link
                  to="/login"
                  style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: 500 }}
                >
                  Remember your password?{' '}
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
