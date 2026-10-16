import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        padding: '56px 0 32px',
        color: 'var(--text-secondary)',
        transition: 'background-color 0.25s ease',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Brand Info */}
          <div style={{ maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--gradient-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                }}
              >
                ⚡
              </div>
              <span style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                InterviewAI
              </span>
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Next-generation AI-powered technical interview preparation. Practice with adaptive real-world questions and get instant expert feedback.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: '999px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
              All AI Models Operational
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Platform
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <li><a href="#features" style={{ color: 'var(--text-secondary)' }}>Features</a></li>
              <li><a href="#how-it-works" style={{ color: 'var(--text-secondary)' }}>How It Works</a></li>
              <li><Link to="/register" style={{ color: 'var(--text-secondary)' }}>Start Practicing Free</Link></li>
              <li><Link to="/login" style={{ color: 'var(--text-secondary)' }}>Candidate Portal</Link></li>
            </ul>
          </div>

          {/* Practice Roles */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Practice Tracks
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <li><span style={{ color: 'var(--text-secondary)' }}>Full Stack & Frontend React</span></li>
              <li><span style={{ color: 'var(--text-secondary)' }}>Backend & System Architecture</span></li>
              <li><span style={{ color: 'var(--text-secondary)' }}>Data Structures & Algorithms</span></li>
              <li><span style={{ color: 'var(--text-secondary)' }}>DevOps & Cloud Engineering</span></li>
            </ul>
          </div>

          {/* Legal / AI Disclaimer */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              AI Intelligence
            </h4>
            <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: '14px' }}>
              Powered by high-performance inference engines across Gemini 2.5, DeepSeek R1, and Groq LLMs with smart multi-provider fallback.
            </p>
            <div style={{ display: 'flex', gap: '14px', color: 'var(--text-muted)' }}>
              <ShieldCheck size={18} />
              <span style={{ fontSize: '13px' }}>Encrypted & Private Sessions</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            fontSize: '13px',
          }}
        >
          <p style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} InterviewAI Inc. Built for ambitious software engineers worldwide.
          </p>
          <div style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)' }}>
            <a href="#" style={{ color: 'var(--text-muted)' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'var(--text-muted)' }}>Terms of Service</a>
            <a href="#" style={{ color: 'var(--text-muted)' }}>Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
