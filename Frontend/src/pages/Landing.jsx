import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Brain,
  Zap,
  Target,
  TrendingUp,
  ShieldCheck,
  FileText,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Cpu,
  BarChart3,
  Clock,
  Layers,
  Award,
  ArrowRight,
  Code2,
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Questions',
    badge: 'Multi-LLM Engine',
    desc: 'Dynamic, non-repetitive technical questions powered by Gemini, DeepSeek & Groq with automatic fallback for high reliability.',
  },
  {
    icon: Target,
    title: 'Role-Based Practice',
    badge: 'Custom Tracks',
    desc: 'Targeted simulations tailored for Frontend, Backend, Full Stack, System Design, DevOps, or customized paste-in Job Descriptions.',
  },
  {
    icon: Sparkles,
    title: 'AI Evaluation',
    badge: 'Instant Grading',
    desc: 'Rigorous multidimensional scoring across Correctness, Clarity, Depth, Structure, and Relevance with actionable improvements.',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    badge: 'Trend Insights',
    desc: 'Visualize your progress with score trend charts, historical skill breakdowns, radar radar metrics, and weak spot detection.',
  },
  {
    icon: Layers,
    title: 'Adaptive Interviews',
    badge: 'Dynamic Depth',
    desc: 'Questions dynamically adapt to your previous answers, probing edge cases and technical depth just like senior engineering managers.',
  },
  {
    icon: FileText,
    title: 'Interview Reports',
    badge: 'Executive PDF',
    desc: 'Receive comprehensive candidate assessment reports complete with performance summaries, topic checklists, and exportable PDFs.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Configure Your Session',
    desc: 'Pick your target role, seniority level (fresher to senior), tech stack, and paste target job descriptions.',
    icon: Target,
  },
  {
    n: '02',
    title: 'Interactive AI Interview',
    desc: 'Answer realistic technical and architectural questions under realistic timed conditions.',
    icon: Code2,
  },
  {
    n: '03',
    title: 'Deep Multi-Metric Feedback',
    desc: 'Get immediate granular evaluation for each question with identified strengths and concrete improvements.',
    icon: Sparkles,
  },
  {
    n: '04',
    title: 'Comprehensive Analytics & PDF',
    desc: 'Review your personalized evaluation report, study recommendations, and track long-term readiness.',
    icon: Award,
  },
];

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          paddingTop: '140px',
          paddingBottom: '80px',
          overflow: 'hidden',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Subtle radial background glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '1000px',
            height: '550px',
            background: 'var(--gradient-hero-overlay)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {/* Top Pill Announcement */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'var(--accent-subtle)',
              border: '1px solid var(--border-accent)',
              marginBottom: '28px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--accent-light)',
            }}
          >
            <Sparkles size={14} />
            <span>Next-Gen Technical Interview Practice Platform</span>
          </div>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: 'clamp(38px, 6vw, 68px)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '24px',
              maxWidth: '920px',
              margin: '0 auto 24px',
            }}
          >
            Ace Your Next <br />
            <span className="text-gradient">Technical Interview</span>
          </h1>

          {/* Supporting Text */}
          <p
            style={{
              fontSize: 'clamp(16px, 2vw, 19px)',
              color: 'var(--text-secondary)',
              maxWidth: '680px',
              margin: '0 auto 36px',
              lineHeight: 1.7,
            }}
          >
            Master technical, behavioral, and system design interviews with AI-powered questions, real-time evaluations, adaptive follow-ups, and in-depth performance analytics.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '60px',
            }}
          >
            <Link to="/register" className="btn btn-primary btn-lg" style={{ gap: '10px' }} id="hero-cta-start">
              <span>Start Practicing Free</span>
              <ChevronRight size={18} />
            </Link>
            <a href="#features" className="btn btn-secondary btn-lg" id="hero-cta-features">
              Explore Features
            </a>
          </div>

          {/* Trust Highlights */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              flexWrap: 'wrap',
              color: 'var(--text-muted)',
              fontSize: '13.5px',
              fontWeight: 500,
              marginBottom: '48px',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--success)" /> Instant AI Feedback
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--success)" /> 14+ Technologies Supported
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--success)" /> No Credit Card Required
            </span>
          </div>

          {/* Product Preview / Mockup */}
          <div
            id="preview"
            style={{
              maxWidth: '1000px',
              margin: '0 auto',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: 'var(--shadow-card-hover)',
              position: 'relative',
              textAlign: 'left',
            }}
          >
            {/* Mockup Window Chrome */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-card)',
                  padding: '4px 16px',
                  borderRadius: '999px',
                  border: '1px solid var(--border)',
                  fontFamily: 'monospace',
                }}
              >
                interview-ai.app/live-session
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge badge-success">● AI Active</span>
              </div>
            </div>

            {/* Mockup Interior Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '16px' }}>
              {/* Question & Answer Mock */}
              <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span className="badge badge-accent">Q3 of 10</span>
                  <span className="badge badge-info">System Design & React</span>
                  <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> 18:42 left
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  How would you design a scalable state management architecture for a real-time collaborative workspace?
                </h3>
                <div
                  style={{
                    background: 'var(--bg-input)',
                    borderRadius: '10px',
                    padding: '14px',
                    border: '1px solid var(--border)',
                    fontSize: '13.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    fontFamily: 'monospace',
                    minHeight: '120px',
                  }}
                >
                  <span style={{ color: 'var(--accent-light)' }}>// Candidate response</span><br />
                  I would decouple local UI state from shared operational state using CRDTs (like Yjs) or Operational Transformation via WebSockets. For local client cache, Zustand or Redux Toolkit with normalized slices...
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <div className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>
                    Submit Answer
                  </div>
                </div>
              </div>

              {/* Instant Evaluation Mock */}
              <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Real-time AI Score
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success)' }}>
                      92<span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
                    </div>
                  </div>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'var(--success-bg)',
                      border: '1px solid var(--success-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--success)',
                      fontWeight: 800,
                    }}
                  >
                    A+
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Technical Depth</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>95%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '5px' }}>
                      <div className="progress-fill" style={{ width: '95%' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Architecture Structure</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>90%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '5px' }}>
                      <div className="progress-fill" style={{ width: '90%' }} />
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--success)' }}>Strengths:</strong> Strong familiarity with CRDTs & real-time synchronization patterns.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Feature Cards */}
      <section id="features" style={{ padding: '90px 0', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 56px' }}>
            <span className="badge badge-accent" style={{ marginBottom: '12px' }}>
              Built for Software Engineers
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: '16px' }}>
              Everything You Need to Get Hired
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
              From initial technical screen to deep architecture debriefs, our AI simulates authentic interview loops.
            </p>
          </div>

          <div className="grid-3">
            {features.map(({ icon: Icon, title, badge, desc }) => (
              <div key={title} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'var(--accent-subtle)',
                      border: '1px solid var(--border-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    {badge}
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', lineHeight: 1.6, flex: 1 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4-Step How It Works Section */}
      <section id="how-it-works" style={{ padding: '90px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: '16px' }}>
              How It Works
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
              Four simple steps to elevate your interview confidence and boost offer rates.
            </p>
          </div>

          <div className="grid-4">
            {steps.map(({ n, title, desc, icon: Icon }) => (
              <div
                key={n}
                className="card"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                }}
              >
                <div
                  style={{
                    fontSize: '44px',
                    fontWeight: 800,
                    color: 'var(--accent)',
                    opacity: 0.25,
                    lineHeight: 1,
                    marginBottom: '16px',
                    fontFamily: 'monospace',
                  }}
                >
                  {n}
                </div>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-light)',
                    marginBottom: '14px',
                  }}
                >
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section
        style={{
          padding: '80px 0',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--gradient-card)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--gradient-hero-overlay)',
            pointerEvents: 'none',
          }}
        />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <span className="badge badge-accent" style={{ marginBottom: '16px' }}>
            Ready to Level Up?
          </span>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: '16px' }}>
            Start Practicing in Under 60 Seconds
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '18px',
              maxWidth: '600px',
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Create your account today, configure your custom interview track, and get detailed AI evaluations on demand.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg" style={{ gap: '10px' }}>
              <span>Get Started Free</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign In to Account
            </Link>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <Footer />
    </div>
  );
}
