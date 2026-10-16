import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import {
  FileText,
  Trash2,
  Play,
  Eye,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function InterviewHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ type: '', status: '', sort: '-createdAt' });
  const LIMIT = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sort: filter.sort };
      if (filter.type) params.type = filter.type;
      if (filter.status) params.status = filter.status;
      const res = await interviewApi.getAll(params);
      setSessions(res.data.sessions || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load interview history');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this interview record? This action cannot be reversed.')) {
      return;
    }
    try {
      await interviewApi.delete(id);
      toast.success('Interview deleted successfully');
      load();
    } catch {
      toast.error('Failed to delete interview');
    }
  };

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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
            Interview History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>
            Manage past technical evaluations, review diagnostic reports, and resume drafts.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/interview/new')}
          id="history-new-btn"
        >
          <Plus size={16} /> New Interview
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
          <Filter size={15} /> Filters:
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '150px', padding: '8px 32px 8px 12px', fontSize: '13.5px' }}
          value={filter.type}
          onChange={(e) => {
            setFilter((f) => ({ ...f, type: e.target.value }));
            setPage(1);
          }}
          id="hist-filter-type"
        >
          <option value="">All Interview Tracks</option>
          <option value="technical">Technical</option>
          <option value="behavioral">Behavioral</option>
          <option value="hr">HR</option>
          <option value="mixed">Mixed</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '140px', padding: '8px 32px 8px 12px', fontSize: '13.5px' }}
          value={filter.status}
          onChange={(e) => {
            setFilter((f) => ({ ...f, status: e.target.value }));
            setPage(1);
          }}
          id="hist-filter-status"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="draft">Draft</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '160px', padding: '8px 32px 8px 12px', fontSize: '13.5px', marginLeft: 'auto' }}
          value={filter.sort}
          onChange={(e) => {
            setFilter((f) => ({ ...f, sort: e.target.value }));
            setPage(1);
          }}
          id="hist-filter-sort"
        >
          <option value="-createdAt">Newest First</option>
          <option value="createdAt">Oldest First</option>
          <option value="-overallScore">Highest Score</option>
        </select>
      </div>

      {/* Content State */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '280px',
            gap: '16px',
          }}
        >
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading your practice history...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--text-muted)',
          }}
        >
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.35 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No sessions match your filter
          </h3>
          <p style={{ fontSize: '14px', maxWidth: '380px', margin: '0 auto 20px' }}>
            Start a new practice interview or adjust your filter selection above.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/interview/new')}
          >
            <Plus size={16} /> Start Practice Interview
          </button>
        </div>
      ) : (
        <>
          {/* List of Interview Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sessions.map((s) => (
              <div
                key={s._id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '18px 24px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Role and metadata */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                      {s.configuration?.targetRole || 'Technical Interview'}
                    </span>
                    {getStatusBadge(s.status)}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                      {s.configuration?.interviewType || 'Technical'}
                    </span>
                    <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                      {s.configuration?.difficulty || 'Medium'}
                    </span>
                    {s.configuration?.technologies?.slice(0, 3).map((tech) => (
                      <span key={tech} className="badge badge-accent" style={{ fontSize: '11px' }}>
                        {tech}
                      </span>
                    ))}
                    {s.configuration?.technologies?.length > 3 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        +{s.configuration.technologies.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Pill */}
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 800,
                      color: getScoreColor(s.overallScore),
                      lineHeight: 1.1,
                    }}
                  >
                    {s.overallScore != null ? s.overallScore : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Overall Score
                  </div>
                </div>

                {/* Date */}
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', minWidth: '95px' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: '5px' }} />
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {s.status === 'completed' ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/reports/${s._id}`)}
                      id={`view-report-${s._id}`}
                      style={{ gap: '6px' }}
                    >
                      <Eye size={14} /> Report
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/interview/${s._id}`)}
                      id={`resume-${s._id}`}
                      style={{ gap: '6px' }}
                    >
                      <Play size={14} /> {s.status === 'draft' ? 'Start' : 'Resume'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(s._id)}
                    id={`delete-${s._id}`}
                    style={{ color: 'var(--danger)', padding: '6px 8px' }}
                    title="Delete session"
                    aria-label="Delete session"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                marginTop: '32px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span style={{ fontSize: '13.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Page {page} of {Math.ceil(total / LIMIT)}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page * LIMIT >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
