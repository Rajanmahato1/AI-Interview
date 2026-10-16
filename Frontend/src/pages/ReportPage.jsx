import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportApi } from '../api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Download,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Target,
  FileText,
} from 'lucide-react';

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(0); // expand first by default

  useEffect(() => {
    reportApi
      .getOne(id)
      .then((res) => {
        setReport(res.data.report);
        setAnswers(res.data.answers || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Diagnostic report not found');
        navigate('/history');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading evaluation report...</p>
      </div>
    );
  }

  if (!report) return null;

  const session = report.sessionId;
  const radarData = report.sectionScores
    ? [
        { subject: 'Technical', score: report.sectionScores.technical ?? 0 },
        { subject: 'Behavioral', score: report.sectionScores.behavioral ?? 0 },
        { subject: 'Communication', score: report.sectionScores.communication ?? 0 },
        { subject: 'Problem Solving', score: report.sectionScores.problemSolving ?? 0 },
      ]
    : [];

  const scoreColor = (s) => {
    if (s == null) return 'var(--text-muted)';
    if (s >= 80) return 'var(--success)';
    if (s >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getScoreGrade = (score) => {
    if (score == null) return 'N/A';
    if (score >= 90) return 'A+ Outstanding';
    if (score >= 80) return 'A Strong Candidate';
    if (score >= 70) return 'B Qualified';
    if (score >= 60) return 'C Needs Practice';
    return 'Needs Preparation';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: '90px', paddingBottom: '80px' }}>
      <Navbar />

      <div className="container-narrow">
        {/* Top Header Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/history')}
            style={{ gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back to History
          </button>

          <a
            href={reportApi.getPdfUrl(id)}
            download
            className="btn btn-primary btn-sm"
            style={{ gap: '8px' }}
            id="download-report-btn"
          >
            <Download size={14} /> Download PDF Assessment
          </a>
        </div>

        {/* Executive Score Hero Card */}
        <div
          className="card"
          style={{
            marginBottom: '28px',
            background: 'var(--gradient-card)',
            borderColor: 'var(--border-accent)',
            boxShadow: 'var(--shadow-card-hover)',
            padding: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '24px',
            }}
          >
            <div style={{ maxWidth: '520px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="badge badge-accent">
                  <Sparkles size={12} /> AI Performance Evaluation
                </span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  {report.generatedAt
                    ? new Date(report.generatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                </span>
              </div>

              <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
                {session?.configuration?.targetRole || 'Technical Interview Report'}
              </h1>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  {session?.configuration?.interviewType || 'Technical'} Track
                </span>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  {session?.configuration?.experienceLevel || 'Mid-Level'}
                </span>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  {session?.configuration?.difficulty || 'Medium'} Difficulty
                </span>
              </div>
            </div>

            {/* Score Ring / Pill */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 28px',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                minWidth: '160px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: scoreColor(report.overallScore),
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {report.overallScore ?? '—'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {getScoreGrade(report.overallScore)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Overall Performance Index
              </div>
            </div>
          </div>
        </div>

        {/* Radar & Section Breakdown */}
        <div className="grid-2" style={{ gap: '24px', marginBottom: '28px' }}>
          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Target size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Competency Radar</h3>
              </div>
              <div style={{ width: '100%', height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#7c3aed"
                      fill="#7c3aed"
                      fillOpacity={0.25}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Section Score Bars */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Award size={18} color="var(--accent)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Core Dimensions</h3>
            </div>

            {Object.entries(report.sectionScores || {}).map(([key, val]) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span style={{ fontWeight: 800, color: val ? scoreColor(val) : 'var(--text-muted)' }}>
                    {val != null ? `${val}/100` : 'N/A'}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${val || 0}%`,
                      background: val ? scoreColor(val) : 'var(--text-muted)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Summary Text */}
        {report.performanceSummary && (
          <div className="card" style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp size={18} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Executive Performance Summary</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '14.5px' }}>
              {report.performanceSummary}
            </p>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid-2" style={{ gap: '24px', marginBottom: '28px' }}>
          {report.strengths?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--success)' }}>
                <CheckCircle size={18} />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Identified Strengths</h3>
              </div>
              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.strengths.map((str, idx) => (
                  <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                    {str}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.weaknesses?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--warning)' }}>
                <AlertTriangle size={18} />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Areas for Growth</h3>
              </div>
              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.weaknesses.map((w, idx) => (
                  <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Improvements & Recommendations */}
        {report.improvements?.length > 0 && (
          <div className="card" style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--warning)' }}>
              <Lightbulb size={20} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Actionable Recommendations
              </h3>
            </div>
            <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {report.improvements.map((imp, idx) => (
                <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                  {imp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Study Topics */}
        {report.suggestedTopics?.length > 0 && (
          <div className="card" style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <BookOpen size={18} color="var(--info)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Suggested Study Topics</h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {report.suggestedTopics.map((topic, idx) => (
                <span key={idx} className="badge badge-info" style={{ fontSize: '13px', padding: '5px 12px' }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Question-by-Question Breakdown Accordion */}
        {answers.length > 0 && (
          <div className="card" style={{ marginBottom: '36px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              Question-by-Question Diagnostic
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {answers.map((ans, idx) => {
                const isExpanded = expandedIndex === idx;
                return (
                  <div
                    key={ans._id || idx}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: isExpanded ? 'var(--bg-elevated)' : 'var(--bg-card)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        gap: '16px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span className="badge badge-accent">Q{idx + 1}</span>
                          <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                            {ans.question?.category || 'Technical'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                          {ans.question?.questionText || `Question ${idx + 1}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '20px',
                              fontWeight: 800,
                              color: scoreColor(ans.overallScore),
                            }}
                          >
                            {ans.overallScore ?? '—'}
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Score</div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          padding: '16px 20px 20px',
                          borderTop: '1px solid var(--border)',
                          background: 'var(--bg-input)',
                        }}
                      >
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Your Answer:
                          </div>
                          <div
                            style={{
                              fontSize: '14px',
                              color: 'var(--text-primary)',
                              lineHeight: 1.6,
                              padding: '12px',
                              borderRadius: '8px',
                              background: 'var(--bg-secondary)',
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                            }}
                          >
                            {ans.answerText}
                          </div>
                        </div>

                        {ans.detailedFeedback && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', marginBottom: '6px' }}>
                              AI Evaluation Feedback:
                            </div>
                            <div
                              style={{
                                fontSize: '14px',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.6,
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {ans.detailedFeedback}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Call to Action */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/interview/new')}
            style={{ gap: '10px' }}
          >
            <Zap size={18} />
            <span>Launch Another Practice Interview</span>
          </button>
        </div>
      </div>
    </div>
  );
}
