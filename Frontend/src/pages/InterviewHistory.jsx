import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';
import toast from 'react-hot-toast';
import { FileText, Trash2, Play, Eye, Filter } from 'lucide-react';

export default function InterviewHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ type: '', status: '', sort: '-createdAt' });
  const LIMIT = 10;

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sort: filter.sort };
      if (filter.type) params.type = filter.type;
      if (filter.status) params.status = filter.status;
      const res = await interviewApi.getAll(params);
      setSessions(res.data.sessions);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, filter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this interview? This cannot be undone.')) return;
    try {
      await interviewApi.delete(id);
      toast.success('Interview deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const statusBadge = (s) => {
    const map = { completed: ['badge-success', '✓'], in_progress: ['badge-info', '▶'], draft: ['badge-accent', '○'], failed: ['badge-danger', '✗'], interrupted: ['badge-warning', '⏸'] };
    const [cls, icon] = map[s] || ['badge-accent', '?'];
    return <span className={`badge ${cls}`}>{icon} {s}</span>;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: '80px' }}>
      <nav className="navbar"><span className="navbar-brand">⚡ InterviewAI</span><div className="navbar-links"><button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>← Dashboard</button></div></nav>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px' }}>Interview History</h1>
          <button className="btn btn-primary" onClick={() => navigate('/interview/new')}>+ New Interview</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 'auto' }} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))} id="hist-filter-type">
            <option value="">All Types</option>
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="hr">HR</option>
            <option value="mixed">Mixed</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} id="hist-filter-status">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="draft">Draft</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filter.sort} onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))} id="hist-filter-sort">
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="-overallScore">Highest Score</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><div className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ marginBottom: '16px' }}>No interviews found</p>
            <button className="btn btn-primary" onClick={() => navigate('/interview/new')}>Start Your First Interview</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessions.map(s => (
                <div key={s._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{s.configuration?.targetRole || 'Interview'}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {statusBadge(s.status)}
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{s.configuration?.interviewType}</span>
                      <span className="badge badge-accent">{s.configuration?.difficulty}</span>
                      {s.configuration?.technologies?.slice(0, 2).map(t => <span key={t} className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{t}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '60px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: s.overallScore >= 70 ? 'var(--success)' : s.overallScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                      {s.overallScore ?? '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Score</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '80px', textAlign: 'right' }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {s.status === 'completed' ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/history`)} id={`view-report-${s._id}`}><Eye size={14} /> Report</button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/interview/${s._id}`)} id={`resume-${s._id}`}><Play size={14} /> {s.status === 'draft' ? 'Start' : 'Resume'}</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)} id={`delete-${s._id}`}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', padding: '6px 12px' }}>Page {page} of {Math.ceil(total / LIMIT)}</span>
                <button className="btn btn-secondary btn-sm" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
