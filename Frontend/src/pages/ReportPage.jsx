import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportApi } from '../api';
import toast from 'react-hot-toast';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Download, ArrowLeft, CheckCircle, AlertTriangle, Lightbulb, BookOpen, TrendingUp } from 'lucide-react';

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    reportApi.getOne(id)
      .then(res => { setReport(res.data.report); setAnswers(res.data.answers || []); })
      .catch(() => { toast.error('Report not found'); navigate('/history'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}><div className="spinner" /></div>;
  if (!report) return null;

  const session = report.sessionId;
  const radarData = report.sectionScores ? [
    { subject: 'Technical', score: report.sectionScores.technical ?? 0 },
    { subject: 'Behavioral', score: report.sectionScores.behavioral ?? 0 },
    { subject: 'Communication', score: report.sectionScores.communication ?? 0 },
    { subject: 'Problem Solving', score: report.sectionScores.problemSolving ?? 0 },
  ] : [];

  const scoreColor = (s) => s >= 80 ? 'var(--success)' : s >= 60 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: '80px' }}>
      <nav className="navbar">
        <span className="navbar-brand">⚡ InterviewAI</span>
        <div className="navbar-links">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}><ArrowLeft size={14} /> History</button>
          <a href={reportApi.getPdfUrl(id)} download className="btn btn-primary btn-sm"><Download size={14} /> Download Report</a>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>{session?.configuration?.targetRole || 'Interview Report'}</h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{session?.configuration?.interviewType}</span>
                <span className="badge badge-info">{session?.configuration?.experienceLevel}</span>
                <span className="badge badge-accent">{session?.configuration?.difficulty}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '56px', fontWeight: 800, color: scoreColor(report.overallScore), lineHeight: 1 }}>{report.overallScore ?? '—'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Overall Score</div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: '24px', marginBottom: '24px' }}>
          {/* Radar chart */}
          {radarData.length > 0 && radarData.some(d => d.score > 0) && (
            <div className="card">
              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Skill Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Radar name="Score" dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Section scores */}
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Section Scores</h3>
            {Object.entries(report.sectionScores || {}).map(([key, val]) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span style={{ fontWeight: 700, color: val ? scoreColor(val) : 'var(--text-muted)' }}>{val ?? 'N/A'}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${val || 0}%`, background: val ? scoreColor(val) : 'var(--text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Summary */}
        {report.performanceSummary && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}><TrendingUp size={18} color="var(--accent-light)" /><h3 style={{ fontSize: '16px' }}>Performance Summary</h3></div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{report.performanceSummary}</p>
          </div>
        )}

        {/* Strengths / Weaknesses */}
        <div className="grid-2" style={{ gap: '24px', marginBottom: '24px' }}>
          {report.strengths?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}><CheckCircle size={18} color="var(--success)" /><h3 style={{ fontSize: '16px' }}>Strengths</h3></div>
              <ul style={{ paddingLeft: '16px' }}>
                {report.strengths.map((s, i) => <li key={i} style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>{s}</li>)}
              </ul>
            </div>
          )}
          {report.weaknesses?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}><AlertTriangle size={18} color="var(--warning)" /><h3 style={{ fontSize: '16px' }}>Weaknesses</h3></div>
              <ul style={{ paddingLeft: '16px' }}>
                {report.weaknesses.map((s, i) => <li key={i} style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Improvements */}
        {report.improvements?.length > 0 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}><Lightbulb size={18} color="var(--warning)" /><h3 style={{ fontSize: '16px' }}>Improvement Recommendations</h3></div>
            <ul style={{ paddingLeft: '16px' }}>
              {report.improvements.map((s, i) => <li key={i} style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>{s}</li>)}
            </ul>
          </div>
        )}

        {/* Suggested Topics */}
        {report.suggestedTopics?.length > 0 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}><BookOpen size={18} color="var(--info)" /><h3 style={{ fontSize: '16px' }}>Suggested Study Topics</h3></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {report.suggestedTopics.map((t, i) => <span key={i} className="badge badge-info">{t}</span>)}
            </div>
          </div>
        )}

        {/* Q&A breakdown */}
        {answers.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Question-by-Question Breakdown</h3>
            {answers.map((a, i) => (
              <div key={a._id} style={{ borderBottom: i < answers.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExpanded(expanded === i ? null : i)}>
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Q{i + 1}: {a.question?.questionText || 'Question'}</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{a.question?.category}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '60px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: scoreColor(a.overallScore) }}>{a.overallScore ?? '—'}</div>
                  </div>
                </div>
                {expanded === i && (
                  <div style={{ marginTop: '12px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Your Answer:</p>
                    <p style={{ marginBottom: '12px' }}>{a.answerText}</p>
                    {a.detailedFeedback && <><p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Feedback:</p><p>{a.detailedFeedback}</p></>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/interview/new')}>Start Another Interview</button>
        </div>
      </div>
    </div>
  );
}
