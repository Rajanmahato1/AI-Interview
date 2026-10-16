import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Mail } from 'lucide-react';

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Mail size={28} color="var(--accent-light)" />
          </div>
          <h1 style={{ fontSize: '24px' }}>Forgot Password?</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>Enter your email and we'll send reset instructions.</p>
        </div>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '16px' }}>✓ Email sent! Check your inbox.</p>
            <Link to="/login" className="btn btn-secondary btn-sm">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" id="forgot-email" required />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : 'Send Reset Link'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <Link to="/login" style={{ color: 'var(--accent-light)' }}>← Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
