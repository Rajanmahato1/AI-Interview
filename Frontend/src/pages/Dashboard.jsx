import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, interviewApi } from '../api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Plus, History, LogOut, User, LayoutDashboard, Trophy, Target, BookOpen, TrendingUp } from 'lucide-react';

function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const items = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Plus, label: 'New Interview', path: '/interview/new' },
    { icon: History, label: 'History', path: '/history' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];
  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '24px' }}>
        <span className="navbar-brand" style={{ fontSize: '18px' }}>⚡ InterviewAI</span>
      </div>
      {items.map(({ icon: Icon, label, path }) => (
        <div key={path} className={`sidebar-item ${window.location.pathname === path ? 'active' : ''}`} onClick={() => navigate(path)} role="button">
          <Icon size={18} /> {label}
        </div>
      ))}
      <div className="divider" style={{ marginTop: 'auto' }} />
      <div className="sidebar-item" onClick={onLogout} role="button" style={{ color: 'var(--danger)' }}>
        <LogOut size={18} /> Logout
      </div>
    </aside>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
      <p style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{payload[0].value}/100</p>
    </div>
  );
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(res => setStats(res.data.stats))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const statusColor = (s) => ({ completed: 'badge-success', in_progress: 'badge-info', draft: 'badge-accent', failed: 'badge-danger', interrupted: 'badge-warning' }[s] || 'badge-accent');

  return (
    <div className="layout">
      <nav className="navbar" style={{ left: 0 }}>
        <span className="navbar-brand">⚡ InterviewAI</span>
        <div className="navbar-links">
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Hi, {user?.name?.split(' ')[0]}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}><LogOut size={14} /> Logout</button>
        </div>
      </nav>
      <Sidebar onLogout={handleLogout} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Track your interview performance</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/interview/new')} id="dash-new-interview">
            <Plus size={16} /> New Interview
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><div className="spinner" /></div>
        ) : stats ? (
          <>
            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: '32px' }}>
              <div className="stat-card"><div className="stat-value">{stats.totalInterviews}</div><div className="stat-label"><Target size={12} style={{ display: 'inline', marginRight: '4px' }} />Total Interviews</div></div>
              <div className="stat-card"><div className="stat-value">{stats.completedInterviews}</div><div className="stat-label"><Trophy size={12} style={{ display: 'inline', marginRight: '4px' }} />Completed</div></div>
              <div className="stat-card"><div className="stat-value">{stats.averageScore ?? '—'}</div><div className="stat-label"><TrendingUp size={12} style={{ display: 'inline', marginRight: '4px' }} />Avg Score</div></div>
              <div className="stat-card"><div className="stat-value">{stats.highestScore ?? '—'}</div><div className="stat-label"><BookOpen size={12} style={{ display: 'inline', marginRight: '4px' }} />Best Score</div></div>
            </div>

            {/* Chart */}
            {stats.scoreTrend?.length > 0 && (
              <div className="card" style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Score Trend</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={stats.scoreTrend.map((s, i) => ({ name: `#${i + 1}`, score: s.score, role: s.role }))}>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Sessions */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px' }}>Recent Interviews</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>View All</button>
              </div>
              {stats.recentSessions?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  <Target size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p>No interviews yet. Start your first one!</p>
                  <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/interview/new')}><Plus size={16} /> Start Interview</button>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Role', 'Type', 'Status', 'Score', 'Date', 'Action'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '12px', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSessions.map(s => (
                      <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px' }}>{s.role || 'N/A'}</td>
                        <td style={{ padding: '12px', textTransform: 'capitalize' }}>{s.type || 'N/A'}</td>
                        <td style={{ padding: '12px' }}><span className={`badge ${statusColor(s.status)}`}>{s.status}</span></td>
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-light)' }}>{s.score ?? '—'}</td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '12px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/interview/${s._id}`)}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Failed to load data.</p>
        )}
      </main>
    </div>
  );
}
