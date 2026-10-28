import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportApi, interviewApi } from '../api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell,
} from 'recharts';
import {
  Download, ArrowLeft, CheckCircle, AlertTriangle, Lightbulb,
  TrendingUp, Sparkles, Zap, Target, RefreshCw, Clock,
  RotateCcw, AlertCircle, FileQuestion, ChevronDown, ChevronUp,
  Mic, Calendar,
} from 'lucide-react';

// --- Markdown Helpers ---
function formatMarkdownText(text) {
  if (!text || typeof text !== 'string') return text || '';
  const cleaned = text.replace(/^[\s*•\-\d.]+\s*/, '').trim();
  const parts = [];
  const regex = /(\*\*|__)(.*?)\1/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) parts.push(cleaned.substring(lastIndex, match.index));
    parts.push(<strong key={match.index} style={{ fontWeight: 600, color: '#0f172a' }}>{match[2]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < cleaned.length) parts.push(cleaned.substring(lastIndex));
  return parts.length > 0 ? parts : cleaned;
}

function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text.replace(/^[\s*•\-\d.]+\s*/, '').replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2').trim();
}

function hexToRgb(hex) {
  const clean = (hex || '#64748b').replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function safeText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.text || v.content || v.label || JSON.stringify(v);
  return String(v);
}

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeout;
    const loadReport = async () => {
      try {
        let res;
        try { res = await interviewApi.getReport(id); } 
        catch (intErr) {
          if (intErr.response?.status === 404) { res = await reportApi.getOne(id); } 
          else { throw intErr; }
        }
        if (cancelled) return;
        const reportStatus = res.data.reportStatus || res.data.report?.reportStatus || res.data.session?.reportStatus;
        if (res.status === 202 || ['pending', 'processing', 'generating'].includes(reportStatus)) {
          setIsProcessing(true); setIsFailed(false); setIsNotFound(false); setLoading(false);
          timeout = window.setTimeout(() => setAttempt((c) => c + 1), 2500); return;
        }
        if (reportStatus === 'failed') {
          setIsFailed(true); setIsProcessing(false); setLoadError('Report generation failed.'); setLoading(false); return;
        }
        if (res.data.report) {
          setReport(res.data.report);
          setSession(res.data.session || res.data.report.sessionId);
          setAnswers(res.data.qa || res.data.answers || []);
          setIsProcessing(false); setIsFailed(false); setIsNotFound(false); setLoadError(''); setLoading(false);
        } else {
          setIsProcessing(true); setLoading(false);
          timeout = window.setTimeout(() => setAttempt((c) => c + 1), 2500);
        }
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        const status = err.response?.status;
        if (status === 404) { setIsNotFound(true); setIsProcessing(false); setIsFailed(false); setLoadError('Not found.'); }
        else { setIsFailed(true); setIsProcessing(false); setLoadError('Failed to load.'); }
      }
    };
    loadReport();
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [id, attempt, refreshKey]);

  const retryReport = async () => {
    setIsRetrying(true); setLoadError(''); setIsFailed(false); setIsProcessing(true);
    try { await interviewApi.finish(id); setAttempt(0); setRefreshKey((k) => k + 1); } 
    catch { try { await reportApi.retry(id); setAttempt(0); setRefreshKey((k) => k + 1); } 
    catch (err) { setLoadError('Failed to restart.'); setIsFailed(true); setIsProcessing(false); } } 
    finally { setIsRetrying(false); }
  };

  const scoreDisplay = useMemo(() => {
    if (!report) return 0;
    const s = report.overallScore ?? session?.totalScore ?? (session?.overallScore ? Math.round(session.overallScore / 10) : 7);
    return s > 10 ? Math.round(s / 10) : s;
  }, [report, session]);

  const getScoreDetails = (score) => {
    const num = Number(score) || 0;
    if (num >= 8) return { label: 'Outstanding', color: '#10b981', bgColor: '#ecfdf5', textColor: '#047857', borderColor: '#a7f3d0' };
    if (num >= 5) return { label: 'Good', color: '#f59e0b', bgColor: '#fffbeb', textColor: '#b45309', borderColor: '#fde68a' };
    return { label: 'Needs Work', color: '#ef4444', bgColor: '#fef2f2', textColor: '#b91c1c', borderColor: '#fecaca' };
  };

  const scoreInfo = useMemo(() => getScoreDetails(scoreDisplay), [scoreDisplay]);
  const summaryText = useMemo(() => report ? (report.summary || report.performanceSummary || '') : '', [report]);
  const strengthsList = useMemo(() => report ? report.strengths || [] : [], [report]);
  const weakAreasList = useMemo(() => report ? report.weakAreas || report.weaknesses || [] : [], [report]);
  const tipsList = useMemo(() => report ? (report.tips || report.improvements || []).slice(0, 3) : [], [report]);

  const perQuestionList = useMemo(() => {
    if (report?.perQuestion && report.perQuestion.length > 0) return report.perQuestion;
    return (answers || []).map((ans, idx) => ({
      question: ans.question?.questionText || ans.questionText || ans.question || `Question ${idx + 1}`,
      score: ans.score ?? (ans.overallScore != null ? (ans.overallScore > 10 ? Math.round(ans.overallScore / 10) : ans.overallScore) : 7),
      comment: ans.comment || ans.detailedFeedback || ans.feedback || 'Good attempt.',
      timeTaken: ans.timeTaken || 0, fillerCount: ans.fillerCount || 0,
    }));
  }, [report, answers]);

  const chartData = useMemo(() => perQuestionList.map((pq, idx) => ({ name: `Q${idx + 1}`, score: pq.score ?? 7 })), [perQuestionList]);

  const interviewDate = useMemo(() => {
    const d = session?.createdAt || report?.createdAt || session?.updatedAt;
    if (!d) return null;
    try { const parsed = new Date(d); return isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } 
    catch { return null; }
  }, [session, report]);

  const roleTitle = useMemo(() => session?.configuration?.targetRole || session?.role || report?.role || 'AI Interview Assessment', [session, report]);
  const interviewType = useMemo(() => session?.configuration?.interviewType || session?.type || 'Technical', [session]);
  const difficulty = useMemo(() => session?.configuration?.difficulty || session?.difficulty || 'Medium', [session]);
  const questionCountText = `${perQuestionList.length} ${perQuestionList.length === 1 ? 'question' : 'questions'} answered`;

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 20;

      const ensureSpace = (needed) => { if (y + needed > pageH - 20) { doc.addPage(); y = 20; } };
      const setFont = (style, size, rgb) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(rgb[0], rgb[1], rgb[2]); };
      
      const drawSectionTitle = (title, rgb) => {
        ensureSpace(11); doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(margin, y - 3, 2, 5, 'F');
        setFont('bold', 12, rgb); doc.text(title, margin + 4, y); y += 7;
      };
      const drawWrapped = (text, rgb, size = 9.5, lh = 4.6) => {
        setFont('normal', size, rgb); const lines = doc.splitTextToSize(safeText(text), contentW);
        lines.forEach((line) => { ensureSpace(lh); doc.text(line, margin, y); y += lh; });
      };
      const drawBullets = (items, accentRgb, size = 9.5, lh = 4.6) => {
        items.forEach((item) => {
          setFont('normal', size, [51, 65, 85]);
          const lines = doc.splitTextToSize(`•  ${stripMarkdown(safeText(item))}`, contentW);
          lines.forEach((line, i) => {
            ensureSpace(lh);
            if (i === 0) { doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]); doc.text('•', margin, y); }
            doc.setTextColor(51, 65, 85); doc.text(line.replace(/^•\s+/, ''), margin + 4, y); y += lh;
          });
          y += 1.5;
        });
        y += 4;
      };

      doc.setFillColor(30, 41, 59); doc.rect(0, 0, pageW, 36, 'F');
      setFont('bold', 18, [255, 255, 255]); doc.text('AI Interview Report', margin, 16);
      setFont('normal', 9.5, [203, 213, 225]);
      doc.text(`Role: ${roleTitle}`, margin, 24);
      doc.text(`${interviewType} • ${difficulty} • ${interviewDate || new Date().toLocaleDateString()}`, margin, 30);
      y = 46;

      const scoreRgb = hexToRgb(scoreInfo.color);
      doc.setFillColor(241, 245, 249); doc.roundedRect(margin, y, contentW, 26, 3, 3, 'F');
      doc.setFillColor(scoreRgb.r, scoreRgb.g, scoreRgb.b); doc.roundedRect(margin + 4, y + 4, 46, 18, 2.5, 2.5, 'F');
      setFont('bold', 16, [255, 255, 255]); doc.text(`${scoreDisplay} / 10`, margin + 27, y + 15.5, { align: 'center' });
      setFont('bold', 13, [15, 23, 42]); doc.text(scoreInfo.label, margin + 56, y + 12);
      setFont('normal', 8.5, [100, 116, 139]); doc.text('Overall Performance Rating', margin + 56, y + 18);
      y += 34;

      drawSectionTitle('Executive Performance Summary', [79, 70, 229]); drawWrapped(stripMarkdown(summaryText), [51, 65, 85], 10); y += 6;
      if (strengthsList.length > 0) { drawSectionTitle('Key Strengths', [16, 185, 129]); drawBullets(strengthsList, [16, 185, 129]); }
      if (weakAreasList.length > 0) { drawSectionTitle('Areas for Improvement', [217, 119, 6]); drawBullets(weakAreasList, [217, 119, 6]); }
      if (tipsList.length > 0) {
        drawSectionTitle(`${tipsList.length} Targeted Improvement Tips`, [79, 70, 229]);
        tipsList.forEach((tip, i) => {
          setFont('bold', 10, [79, 70, 229]); ensureSpace(4.6); doc.text(`${i + 1}.`, margin, y);
          setFont('normal', 9.5, [51, 65, 85]); const lines = doc.splitTextToSize(stripMarkdown(safeText(tip)), contentW - 6);
          lines.forEach((line) => { ensureSpace(4.6); doc.text(line, margin + 6, y); y += 4.6; }); y += 2;
        }); y += 4;
      }
      if (chartData.length > 0) {
        drawSectionTitle('Question Score Trajectory', [79, 70, 229]);
        const chartH = 34, barGap = 3, barW = Math.min(14, (contentW - barGap * (chartData.length - 1)) / chartData.length);
        const startX = margin + (contentW - (barW * chartData.length + barGap * (chartData.length - 1))) / 2;
        ensureSpace(chartH + 14); doc.setDrawColor(203, 213, 225); doc.line(margin, y + chartH + 4, margin + contentW, y + chartH + 4);
        chartData.forEach((d, i) => {
          const barH = Math.max(1, (d.score / 10) * chartH), x = startX + i * (barW + barGap), barY = y + 4 + chartH - barH;
          const rgb = hexToRgb(getScoreDetails(d.score).color);
          doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.rect(x, barY, barW, barH, 'F');
          setFont('bold', 7, [51, 65, 85]); doc.text(String(d.score), x + barW / 2, barY - 1.5, { align: 'center' });
          setFont('normal', 7, [100, 116, 139]); doc.text(d.name, x + barW / 2, y + 4 + chartH + 7, { align: 'center' });
        }); y += chartH + 16;
      }
      if (perQuestionList.length > 0) {
        drawSectionTitle('Question-by-Question Breakdown', [15, 23, 42]);
        perQuestionList.forEach((pq, idx) => {
          const qText = `Q${idx + 1}:  ${stripMarkdown(safeText(pq.question))}`, qLines = doc.splitTextToSize(qText, contentW);
          const metaParts = [`Score: ${pq.score ?? 'N/A'}/10`]; if (pq.timeTaken) metaParts.push(`Time: ${pq.timeTaken}s`); if (pq.fillerCount != null) metaParts.push(`Fillers: ${pq.fillerCount}`);
          const metaText = metaParts.join('   |   '), feedback = pq.comment ? `Feedback: ${stripMarkdown(safeText(pq.comment))}` : '';
          const feedbackLines = feedback ? doc.splitTextToSize(feedback, contentW) : [];
          ensureSpace(qLines.length * 5 + 6);
          setFont('bold', 10.5, [30, 41, 59]); qLines.forEach((line) => { ensureSpace(5); doc.text(line, margin, y); y += 5; });
          setFont('normal', 8.5, [100, 116, 139]); ensureSpace(4.5); doc.text(metaText, margin, y); y += 6.5;
          if (feedbackLines.length > 0) { setFont('normal', 9, [71, 85, 105]); feedbackLines.forEach((line) => { ensureSpace(4.2); doc.text(line, margin, y); y += 4.2; }); }
          y += 5;
        });
      }
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p); doc.setDrawColor(226, 232, 240); doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
        setFont('normal', 8, [148, 163, 184]); doc.text('AI Interview Report', margin, pageH - 9); doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 9, { align: 'right' });
      }
      doc.save(`Interview_Report_${(id || 'report').slice(-6)}.pdf`); toast.success('Report PDF downloaded!');
    } catch (err) { toast.error('Failed to generate PDF.'); }
  };

  // --- CUSTOM CSS FALLBACK ---
  const fallbackStyle = `
    .report-wrapper { background-color: #f8fafc; min-height: 100vh; width: 100%; display: flex; justify-content: center; padding-bottom: 5rem; font-family: system-ui, -apple-system, sans-serif; }
    .report-container { width: 100%; max-width: 1024px; margin: 0 auto; padding: 7rem 1rem 0; display: flex; flex-direction: column; gap: 1.5rem; }
    
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); width: 100%; box-sizing: border-box; }
    @media(min-width: 640px) { .card { padding: 2rem; } }
    
    .header-flex { display: flex; flex-direction: column; gap: 1.5rem; }
    @media(min-width: 768px) { .header-flex { flex-direction: row; justify-content: space-between; align-items: center; } }
    
    .btn-group { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #4f46e5; color: #fff; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; }
    .btn-primary:hover { background: #4338ca; }
    .btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #fff; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .btn-secondary:hover { background: #f1f5f9; }
    
    .score-section { display: flex; flex-direction: column; align-items: center; gap: 2rem; text-align: center; }
    @media(min-width: 768px) { .score-section { flex-direction: row; text-align: left; align-items: stretch; gap: 3rem; } }
    
    .circle-wrapper { position: relative; width: 144px; height: 144px; flex-shrink: 0; margin: 0 auto; }
    .circle-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .circle-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .score-text { font-size: 2.5rem; font-weight: 900; line-height: 1; color: #0f172a; }
    .score-label { margin-top: 0.5rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
    @media(min-width: 768px) { .grid-2 { grid-template-columns: 1fr 1fr; } }
    .grid-3 { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    @media(min-width: 768px) { .grid-3 { grid-template-columns: repeat(3, 1fr); } }
    
    .section-title { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; font-size: 1.125rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
    .icon-box { width: 2rem; height: 2rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    
    .list-item { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.875rem; color: #475569; line-height: 1.6; margin-bottom: 0.75rem; }
    
    .badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; text-transform: capitalize; }
    
    .q-card { border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; margin-bottom: 0.75rem; }
    .q-header { padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: #fff; transition: 0.2s; }
    .q-header:hover { background: #f8fafc; }
    .q-body { padding: 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.875rem; color: #475569; line-height: 1.6; }
    
    .loading-spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `;

  if (loading && !isProcessing && !isFailed && !isNotFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <style>{fallbackStyle}</style>
        <div className="loading-spinner" />
        <p style={{ color: '#64748b', fontWeight: 500 }}>Loading interview report...</p>
      </div>
    );
  }

  // (Baqi states same as before, bas fallbackStyle include kiya hai)
  
  if (!report) return null;

  return (
    <>
      <style>{fallbackStyle}</style>
      <div className="report-wrapper">
        <Navbar />
        <div className="report-container">
          
          {/* HEADER */}
          <div className="card header-flex">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Sparkles size={14} /> AI Interview Report
                </span>
                {interviewDate && (
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontWeight: 500 }}>
                    <Calendar size={14} /> {interviewDate}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                {roleTitle}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="badge">{interviewType}</span>
                <span className="badge">{difficulty}</span>
                <span className="badge">{questionCountText}</span>
              </div>
            </div>
            <div className="btn-group">
              <button onClick={handleDownloadPdf} className="btn-primary">
                <Download size={16} /> Download PDF
              </button>
              <button onClick={() => navigate('/history')} className="btn-secondary">
                <ArrowLeft size={16} /> Back
              </button>
            </div>
          </div>

          {/* SCORE & SUMMARY */}
          <div className="card">
            <div className="score-section">
              <div className="circle-wrapper">
                <svg className="circle-svg" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="54" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                  <circle cx="70" cy="70" r="54" fill="transparent" stroke={scoreInfo.color} strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - Math.min(10, Math.max(0, scoreDisplay)) / 10)}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                </svg>
                <div className="circle-content">
                  <div className="score-text">
                    {scoreDisplay}<span style={{ fontSize: '1.125rem', color: '#94a3b8', fontWeight: 700 }}>/10</span>
                  </div>
                  <span className="score-label" style={{ background: scoreInfo.bgColor, color: scoreInfo.textColor, borderColor: scoreInfo.borderColor }}>
                    {scoreInfo.label}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <Target size={16} /> Executive Performance Summary
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '1.25rem', borderRadius: '0.75rem', color: '#475569', fontSize: '0.9375rem', lineHeight: 1.6, textAlign: 'left' }}>
                  {formatMarkdownText(summaryText)}
                </div>
              </div>
            </div>
          </div>

          {/* STRENGTHS & WEAKNESSES */}
          <div className="grid-2">
            <div className="card">
              <div className="section-title" style={{ color: '#059669' }}>
                <div className="icon-box" style={{ background: '#ecfdf5' }}><CheckCircle size={18} /></div>
                Key Strengths
              </div>
              <div>
                {strengthsList.length > 0 ? strengthsList.map((str, idx) => (
                  <div key={idx} className="list-item">
                    <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '0.125rem' }} />
                    <span>{formatMarkdownText(str)}</span>
                  </div>
                )) : <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.875rem' }}>No strengths recorded.</p>}
              </div>
            </div>
            <div className="card">
              <div className="section-title" style={{ color: '#d97706' }}>
                <div className="icon-box" style={{ background: '#fffbeb' }}><AlertTriangle size={18} /></div>
                Areas for Improvement
              </div>
              <div>
                {weakAreasList.length > 0 ? weakAreasList.map((w, idx) => (
                  <div key={idx} className="list-item">
                    <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '0.125rem' }} />
                    <span>{formatMarkdownText(w)}</span>
                  </div>
                )) : <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.875rem' }}>No areas for improvement recorded.</p>}
              </div>
            </div>
          </div>

          {/* TIPS */}
          {tipsList.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ color: '#4f46e5' }}>
                <div className="icon-box" style={{ background: '#e0e7ff' }}><Lightbulb size={18} /></div>
                {tipsList.length} Targeted Improvement Tips
              </div>
              <div className="grid-3">
                {tipsList.map((tip, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                      #{idx + 1}
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      {formatMarkdownText(tip)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHART */}
          {chartData.length > 0 && (
            <div className="card">
              <div className="section-title">
                <div className="icon-box" style={{ background: '#e0e7ff', color: '#4f46e5' }}><TrendingUp size={18} /></div>
                Question Score Trajectory
              </div>
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px' }} formatter={(val) => [`${val} / 10`, 'Score']} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={getScoreDetails(entry.score).color} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* QUESTION BREAKDOWN */}
          {perQuestionList.length > 0 && (
            <div className="card">
              <div className="section-title">
                <div className="icon-box" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Target size={18} /></div>
                Question-by-Question Breakdown
              </div>
              <div>
                {perQuestionList.map((pq, idx) => {
                  const isExpanded = expandedIndex === idx;
                  const score10 = pq.score ?? 7;
                  const qScoreInfo = getScoreDetails(score10);
                  return (
                    <div key={idx} className="q-card">
                      <div onClick={() => setExpandedIndex(isExpanded ? null : idx)} className="q-header">
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>Q{idx + 1}</span>
                            {pq.timeTaken > 0 && <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {pq.timeTaken}s</span>}
                            {pq.fillerCount != null && <span style={{ color: pq.fillerCount === 0 ? '#059669' : '#d97706', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Mic size={12} /> {pq.fillerCount} fillers</span>}
                          </div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem', lineHeight: 1.4 }}>
                            {stripMarkdown(pq.question)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: qScoreInfo.color }}>{score10}<span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/10</span></div>
                          <div style={{ color: '#94a3b8' }}>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="q-body">
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>AI Feedback</div>
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.5rem' }}>
                            {formatMarkdownText(pq.comment || 'Detailed response evaluated.')}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ textAlign: 'center', paddingTop: '1rem', paddingBottom: '2rem' }}>
            <button onClick={() => navigate('/interview/new')} className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
              <Zap size={18} /> Launch Another Practice Interview
            </button>
          </div>

        </div>
      </div>
    </>
  );
}