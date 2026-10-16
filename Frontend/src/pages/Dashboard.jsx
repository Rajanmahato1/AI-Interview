import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import {
  Plus,
  History,
  Target,
  Trophy,
  TrendingUp,
  Award,
  ArrowRight,
  Clock,
  Sparkles,
  Calendar,
  Eye,
  Play,
  FileCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-accent)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        Session {label} • {data.role || 'Interview'}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>
        Score: {payload[0].value}/100
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then((res) => {
        setStats(res.data.stats);
        setError(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        toast.error('Failed to load dashboard metrics');
      })
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status) => {
    const config = {
      completed: { cls: 'badge-success', label: 'Completed' },
      in_progress: { cls: 'badge-info', label: 'In Progress' },
      draft: { cls: 'badge-neutral', label: 'Draft' },
      failed: { cls: 'badge-danger', label: 'Failed' },
      interrupted: { cls: 'badge-warning', label: 'Interrupted' },
    }[status] || { cls: 'badge-neutral', label: status };

    return <span className={`badge ${config.cls}`}>{config.label}</span>;
  };

  const getScoreColor = (score) => {
    if (score == null) return 'var(--text-muted)';
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <AppLayout>
      {/* Welcome Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-accent">Candidate Workspace</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Engineer'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>
            Ready to sharpen your technical and system design skills today?
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/history')}
            id="dash-quick-history"
          >
            <History size={16} />
            <span>History</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/interview/new')}
            id="dash-new-interview"
          >
            <Plus size={16} />
            <span>New Interview</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '360px',
            gap: '16px',
          }}
        >
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading interview analytics...</p>
        </div>
      ) : error ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            borderColor: 'var(--danger-border)',
          }}
        >
          <AlertCircle size={44} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Could not load metrics</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Please check your connection and try again.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : stats ? (
        <>
          {/* Key Stat Cards */}
          <div className="grid-4" style={{ marginBottom: '32px' }}>
            {/* Total Interviews */}
            <div className="stat-card">
              <div
                className="stat-card-icon"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
              >
                <Target size={22} />
              </div>
              <div className="stat-value">{stats.totalInterviews ?? 0}</div>
              <div className="stat-label">Total Practice Sessions</div>
            </div>

            {/* Completed */}
            <div className="stat-card">
              <div
                className="stat-card-icon"
                style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
              >
                <Trophy size={22} />
              </div>
              <div className="stat-value">{stats.completedInterviews ?? 0}</div>
              <div className="stat-label">Completed Interviews</div>
            </div>

            {/* Average Score */}
            <div className="stat-card">
              <div
                className="stat-card-icon"
                style={{ background: 'var(--info-bg)', color: 'var(--info)' }}
              >
                <TrendingUp size={22} />
              </div>
              <div className="stat-value">
                {stats.averageScore != null ? `${Math.round(stats.averageScore)}` : '—'}
                {stats.averageScore != null && (
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    /100
                  </span>
                )}
              </div>
              <div className="stat-label">Average Score</div>
            </div>

            {/* Highest Score */}
            <div className="stat-card">
              <div
                className="stat-card-icon"
                style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
              >
                <Award size={22} />
              </div>
              <div className="stat-value">
                {stats.highestScore != null ? `${Math.round(stats.highestScore)}` : '—'}
                {stats.highestScore != null && (
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    /100
                  </span>
                )}
              </div>
              <div className="stat-label">Personal Best Score</div>
            </div>
          </div>

          {/* Performance Chart & Quick Start Prompt */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: stats.scoreTrend?.length > 0 ? 'minmax(0, 2fr) minmax(0, 1fr)' : '1fr',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {/* Trend Chart */}
            {stats.scoreTrend?.length > 0 ? (
              <div className="card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Performance Progression</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      Overall score tracking across consecutive interview sessions
                    </p>
                  </div>
                  <span className="badge badge-accent">
                    <Sparkles size={12} /> AI Evaluated
                  </span>
                </div>

                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats.scoreTrend.map((s, i) => ({
                        name: `#${i + 1}`,
                        score: s.score,
                        role: s.role,
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#7c3aed"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#scoreGlow)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                <TrendingUp size={36} color="var(--accent-light)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                  No Score History Yet
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 16px' }}>
                  Complete your first technical interview session to unlock comprehensive score trend analytics.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/interview/new')}
                >
                  <Plus size={16} /> Start Your First Session
                </button>
              </div>
            )}

            {/* Quick Tips / Role Preset Card */}
            {stats.scoreTrend?.length > 0 && (
              <div
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'var(--gradient-card)',
                }}
              >
                <div>
                  <div className="badge badge-accent" style={{ marginBottom: '12px' }}>
                    Recommended Practice
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                    Ready for a Challenge?
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '16px' }}>
                    Try an adaptive mixed technical & behavioral session targeting your weakest areas.
                  </p>
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: '10px',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      fontSize: '12.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '16px',
                    }}
                  >
                    💡 Pro tip: Detailed, structured answers scoring high in clarity and edge cases receive the highest AI marks.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => navigate('/interview/new')}
                  style={{ justifyContent: 'center' }}
                >
                  <Zap size={16} /> Configure Next Session
                </button>
              </div>
            )}
          </div>

          {/* Recent Interview History */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Recent Interview Sessions</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Review your recent test sessions, resume in-progress interviews, or view reports
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/history')}
              >
                View Full History <ArrowRight size={14} />
              </button>
            </div>

            {stats.recentSessions?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
                <Target size={44} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
                <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  No sessions recorded yet
                </h3>
                <p style={{ fontSize: '14px', marginBottom: '20px' }}>
                  Launch your first practice interview to begin building your skill profile.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/interview/new')}
                >
                  <Plus size={16} /> Start Interview
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="table-saas">
                  <thead>
                    <tr>
                      <th>Target Role</th>
                      <th>Interview Type</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSessions.map((session) => (
                      <tr key={session._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {session.role || 'Software Engineer'}
                          </div>
                          {session.technologies?.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {session.technologies.slice(0, 3).join(', ')}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="badge badge-neutral"
                            style={{ textTransform: 'capitalize' }}
                          >
                            {session.type || 'Technical'}
                          </span>
                        </td>
                        <td>{getStatusBadge(session.status)}</td>
                        <td>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '15px',
                              color: getScoreColor(session.score),
                            }}
                          >
                            {session.score != null ? `${session.score}/100` : '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {session.date ? new Date(session.date).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {session.status === 'completed' ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => navigate(`/reports/${session._id}`)}
                              style={{ gap: '6px' }}
                            >
                              <FileCheck size={14} /> Report
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/interview/${session._id}`)}
                              style={{ gap: '6px' }}
                            >
                              <Play size={14} /> Resume
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          No data available.
        </div>
      )}
    </AppLayout>
  );
}
