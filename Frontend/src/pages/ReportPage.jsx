import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportApi, interviewApi } from '../api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Download,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Sparkles,
  Zap,
  Target,
  RefreshCw,
  Clock,
  RotateCcw,
  AlertCircle,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Mic,
} from 'lucide-react';

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
        // First try interview report endpoint (TASK 1)
        let res;
        try {
          res = await interviewApi.getReport(id);
        } catch (intErr) {
          if (intErr.response?.status === 404) {
            // Fallback to legacy reportApi
            res = await reportApi.getOne(id);
          } else {
            throw intErr;
          }
        }

        if (cancelled) return;

        const reportStatus = res.data.reportStatus || res.data.report?.reportStatus || res.data.session?.reportStatus;

        // Still processing / generating
        if (res.status === 202 || ['pending', 'processing', 'generating'].includes(reportStatus)) {
          setIsProcessing(true);
          setIsFailed(false);
          setIsNotFound(false);
          setLoading(false);
          timeout = window.setTimeout(() => setAttempt((current) => current + 1), 2500);
          return;
        }

        if (reportStatus === 'failed') {
          setIsFailed(true);
          setIsProcessing(false);
          setLoadError('Report generation failed. You can safely restart generation.');
          setLoading(false);
          return;
        }

        if (res.data.report) {
          setReport(res.data.report);
          setSession(res.data.session || res.data.report.sessionId);
          setAnswers(res.data.qa || res.data.answers || []);
          setIsProcessing(false);
          setIsFailed(false);
          setIsNotFound(false);
          setLoadError('');
          setLoading(false);
        } else {
          // If no report object returned yet but session complete
          setIsProcessing(true);
          setLoading(false);
          timeout = window.setTimeout(() => setAttempt((current) => current + 1), 2500);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          const status = err.response?.status;
          const apiError = err.response?.data?.error;

          if (status === 404) {
            setIsNotFound(true);
            setIsProcessing(false);
            setIsFailed(false);
            setLoadError('Interview or report record not found.');
          } else if (status === 503 || apiError?.code === 'REPORT_GENERATION_FAILED') {
            setIsFailed(true);
            setIsProcessing(false);
            setLoadError(apiError?.message || 'Report generation failed. Please try again.');
          } else {
            setIsFailed(true);
            setIsProcessing(false);
            setLoadError(apiError?.message || 'Unable to load report. Please verify connection.');
          }
        }
      }
    };

    loadReport();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [id, attempt, refreshKey]);

  const retryReport = async () => {
    setIsRetrying(true);
    setLoadError('');
    setIsFailed(false);
    setIsProcessing(true);
    try {
      await interviewApi.finish(id);
      setAttempt(0);
      setRefreshKey((k) => k + 1);
    } catch {
      try {
        await reportApi.retry(id);
        setAttempt(0);
        setRefreshKey((k) => k + 1);
      } catch (err) {
        setLoadError(err.response?.data?.error?.message || 'Failed to restart generation.');
        setIsFailed(true);
        setIsProcessing(false);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // Harmonized data fields
  const scoreDisplay = useMemo(() => {
    if (!report) return 0;
    const s = report.overallScore ?? session?.totalScore ?? (session?.overallScore ? Math.round(session.overallScore / 10) : 7);
    return s > 10 ? Math.round(s / 10) : s;
  }, [report, session]);

  const summaryText = useMemo(() => {
    if (!report) return '';
    return report.summary || report.performanceSummary || 'Comprehensive interview evaluation complete.';
  }, [report]);

  const strengthsList = useMemo(() => {
    if (!report) return [];
    return report.strengths || [];
  }, [report]);

  const weakAreasList = useMemo(() => {
    if (!report) return [];
    return report.weakAreas || report.weaknesses || [];
  }, [report]);

  const tipsList = useMemo(() => {
    if (!report) return [];
    const raw = report.tips || report.improvements || [];
    return raw.slice(0, 3);
  }, [report]);

  const perQuestionList = useMemo(() => {
    if (report?.perQuestion && report.perQuestion.length > 0) {
      return report.perQuestion;
    }
    return (answers || []).map((ans, idx) => ({
      question: ans.question?.questionText || ans.questionText || ans.question || `Question ${idx + 1}`,
      score: ans.score ?? (ans.overallScore != null ? (ans.overallScore > 10 ? Math.round(ans.overallScore / 10) : ans.overallScore) : 7),
      comment: ans.comment || ans.detailedFeedback || ans.feedback || 'Good attempt on this problem.',
      timeTaken: ans.timeTaken || 0,
      fillerCount: ans.fillerCount || 0,
    }));
  }, [report, answers]);

  const chartData = useMemo(() => {
    return perQuestionList.map((pq, idx) => {
      const s = pq.score != null ? pq.score : 7;
      return {
        name: `Q${idx + 1}`,
        score: s,
        question: pq.question,
      };
    });
  }, [perQuestionList]);

  const getScoreGrade = (score) => {
    if (score == null) return 'N/A';
    if (score >= 9) return 'Outstanding';
    if (score >= 8) return 'Strong Candidate';
    if (score >= 6) return 'Qualified';
    if (score >= 4) return 'Needs Practice';
    return 'Preparation Required';
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981'; // green
    if (score >= 6) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF();
      const roleTitle = session?.configuration?.targetRole || 'Interview Assessment';

      // Header Banner
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('AI Interview Practice Report', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(203, 213, 225);
      doc.text(`Role: ${roleTitle}  |  Date: ${new Date().toLocaleDateString()}`, 14, 26);

      // Score Callout
      doc.setFontSize(16);
      doc.setTextColor(79, 70, 229);
      doc.text(`Overall Score: ${scoreDisplay} / 10 (${getScoreGrade(scoreDisplay)})`, 14, 44);

      // Executive Summary
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Performance Summary', 14, 54);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const summaryLines = doc.splitTextToSize(summaryText, 182);
      doc.text(summaryLines, 14, 61);

      let currentY = 61 + summaryLines.length * 5 + 6;

      // Key Strengths
      if (strengthsList.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(16, 185, 129);
        doc.text('Key Strengths', 14, currentY);
        currentY += 6;
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        strengthsList.forEach((s) => {
          const lines = doc.splitTextToSize(`• ${s}`, 182);
          doc.text(lines, 14, currentY);
          currentY += lines.length * 4.5;
        });
        currentY += 4;
      }

      // Weak Areas
      if (weakAreasList.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68);
        doc.text('Areas for Improvement', 14, currentY);
        currentY += 6;
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        weakAreasList.forEach((w) => {
          const lines = doc.splitTextToSize(`• ${w}`, 182);
          doc.text(lines, 14, currentY);
          currentY += lines.length * 4.5;
        });
        currentY += 4;
      }

      // Improvement Tips
      if (tipsList.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(217, 119, 6);
        doc.text('Recommended Improvement Tips', 14, currentY);
        currentY += 6;
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        tipsList.forEach((t, i) => {
          const lines = doc.splitTextToSize(`${i + 1}. ${t}`, 182);
          doc.text(lines, 14, currentY);
          currentY += lines.length * 4.5;
        });
        currentY += 6;
      }

      // Question Breakdown
      if (perQuestionList.length > 0) {
        if (currentY > 210) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text('Question-by-Question Breakdown', 14, currentY);
        currentY += 8;

        perQuestionList.forEach((pq, idx) => {
          if (currentY > 240) {
            doc.addPage();
            currentY = 20;
          }
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          const meta = [];
          if (pq.timeTaken) meta.push(`${pq.timeTaken}s`);
          if (pq.fillerCount != null) meta.push(`${pq.fillerCount} fillers`);
          const metaStr = meta.length ? ` [${meta.join(', ')}]` : '';
          const qHeader = doc.splitTextToSize(`Q${idx + 1}: ${pq.question} (Score: ${pq.score ?? 'N/A'}/10)${metaStr}`, 182);
          doc.text(qHeader, 14, currentY);
          currentY += qHeader.length * 4.8;

          if (pq.comment) {
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            const commentLines = doc.splitTextToSize(`Feedback: ${pq.comment}`, 182);
            doc.text(commentLines, 14, currentY);
            currentY += commentLines.length * 4.5 + 4;
          }
        });
      }

      doc.save(`Interview_Report_${id.slice(-6)}.pdf`);
      toast.success('Report PDF downloaded!');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  // 1. Initial Loading State
  if (loading && !isProcessing && !isFailed && !isNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Loading interview report...</p>
      </div>
    );
  }

  // 2. Active Processing State
  if (isProcessing && !report) {
    const progressPercent = Math.min(95, Math.max(15, (attempt + 1) * 8));
    return (
      <div className="min-h-screen bg-slate-900 text-white pt-24 px-4">
        <Navbar />
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-8 sm:p-12 text-center shadow-2xl backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-4 border border-indigo-500/20">
              <Clock size={12} /> Synthesizing LLM Diagnostic
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
              Interview Ended. Generating Report…
            </h2>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-8">
              Our AI evaluation engine is analyzing your questions, responses, technical depth, and voice metrics to generate a personalized report. This page will update automatically.
            </p>

            <div className="max-w-md mx-auto mb-8">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Compiling metrics & scores...</span>
                <span className="font-bold text-indigo-400">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition"
              >
                <RefreshCw size={14} /> Check Status Now
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition"
              >
                Back to History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error / Failed State
  if (isFailed && !report) {
    return (
      <div className="min-h-screen bg-slate-900 text-white pt-24 px-4">
        <Navbar />
        <div className="max-w-md mx-auto">
          <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={30} />
            </div>
            <h2 className="text-xl font-bold mb-2">Report Generation Issue</h2>
            <p className="text-slate-400 text-sm mb-6">
              {loadError || 'The diagnostic report encountered an issue. You can safely restart report generation.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={retryReport}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                <RotateCcw size={15} /> {isRetrying ? 'Retrying...' : 'Restart Generation'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition"
              >
                Back to History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Not Found State
  if (isNotFound && !report) {
    return (
      <div className="min-h-screen bg-slate-900 text-white pt-24 px-4">
        <Navbar />
        <div className="max-w-md mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center mx-auto mb-4">
              <FileQuestion size={30} />
            </div>
            <h2 className="text-xl font-bold mb-2">Interview Report Not Found</h2>
            <p className="text-slate-400 text-sm mb-6">
              No interview record or evaluation report found for this session identifier.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
              >
                Back to History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pt-24 pb-20 px-4 sm:px-6">
      <Navbar />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition shadow-sm"
          >
            <ArrowLeft size={16} /> Back to History
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
              id="download-pdf-btn"
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

        {/* Hero Card: Role, Circular Score & Executive Summary */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/80 rounded-2xl p-6 sm:p-10 shadow-xl backdrop-blur-md">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left: Role Info & Summary */}
            <div className="flex-1 space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
                <Sparkles size={13} /> AI Interview Report
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {session?.configuration?.targetRole || 'Interview Performance Report'}
              </h1>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 capitalize">
                  {session?.configuration?.interviewType || 'Technical'} Track
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 capitalize">
                  {session?.configuration?.difficulty || 'Medium'} Difficulty
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                  {perQuestionList.length} Questions Answered
                </span>
              </div>

              <div className="pt-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Executive Performance Summary
                </h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                  {summaryText}
                </p>
              </div>
            </div>

            {/* Right: Big Circular Overall Score */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center w-40 h-40 sm:w-44 sm:h-44 rounded-full border-4 border-indigo-500/80 bg-slate-900/80 shadow-2xl shadow-indigo-500/20">
                {/* Score numbers */}
                <div className="text-center">
                  <div
                    className="text-5xl sm:text-6xl font-black tracking-tight leading-none"
                    style={{ color: getScoreColor(scoreDisplay) }}
                  >
                    {scoreDisplay}
                    <span className="text-xl sm:text-2xl font-bold text-slate-400">/10</span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mt-2">
                    {getScoreGrade(scoreDisplay)}
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Overall Performance
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths and Weak Areas in Two Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths Card */}
          <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-6 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 text-emerald-400 font-bold text-lg mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle size={18} />
              </div>
              <span>Key Strengths</span>
            </div>
            {strengthsList.length > 0 ? (
              <ul className="space-y-3">
                {strengthsList.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Solid attempt across all technical topics.</p>
            )}
          </div>

          {/* Weak Areas Card */}
          <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 text-amber-400 font-bold text-lg mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <span>Areas for Improvement</span>
            </div>
            {weakAreasList.length > 0 ? (
              <ul className="space-y-3">
                {weakAreasList.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Continue practicing advanced architectural topics.</p>
            )}
          </div>
        </div>

        {/* 3 Improvement Tips */}
        {tipsList.length > 0 && (
          <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 shadow-lg">
            <div className="flex items-center gap-3 text-indigo-400 font-bold text-lg mb-5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Lightbulb size={18} />
              </div>
              <span>3 Targeted Improvement Tips</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tipsList.map((tip, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500/40 transition"
                >
                  <div className="space-y-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Chart using Recharts */}
        {chartData.length > 0 && (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-3 font-bold text-lg text-white">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
                <span>Question Score Trajectory</span>
              </div>
              <span className="text-xs text-slate-400">Scores evaluated on 0–10 scale</span>
            </div>

            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#475569',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} / 10`, 'Score']}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Per-Question List with Voice Metrics (timeTaken, fillerCount) */}
        {perQuestionList.length > 0 && (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 font-bold text-lg text-white">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Target size={18} />
                </div>
                <span>Per-Question Evaluation & Feedback</span>
              </div>
              <span className="text-xs text-slate-400">
                {perQuestionList.length} items
              </span>
            </div>

            <div className="space-y-3">
              {perQuestionList.map((pq, idx) => {
                const isExpanded = expandedIndex === idx;
                const score10 = pq.score != null ? pq.score : 7;

                return (
                  <div
                    key={idx}
                    className="border border-slate-700/70 rounded-xl overflow-hidden bg-slate-900/40 transition hover:border-slate-600"
                  >
                    <div
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                            Q{idx + 1}
                          </span>

                          {/* Time Taken Indicator */}
                          {pq.timeTaken > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700">
                              <Clock size={11} className="text-indigo-400" />
                              <span>{pq.timeTaken}s</span>
                            </span>
                          )}

                          {/* Filler Count Indicator */}
                          {pq.fillerCount != null && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${
                                pq.fillerCount === 0
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              }`}
                            >
                              <Mic size={11} />
                              <span>{pq.fillerCount} filler{pq.fillerCount === 1 ? '' : 's'}</span>
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-sm sm:text-base text-white">
                          {pq.question}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div
                            className="text-xl sm:text-2xl font-black"
                            style={{ color: getScoreColor(score10) }}
                          >
                            {score10}
                            <span className="text-xs font-medium text-slate-400">/10</span>
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">
                            Score
                          </div>
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-800 bg-slate-900/70 space-y-3 text-sm">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                            AI Evaluation & Feedback:
                          </div>
                          <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 leading-relaxed">
                            {pq.comment || 'Detailed response evaluated and stored.'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom CTA Button */}
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => navigate('/interview/new')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/30"
          >
            <Zap size={18} />
            <span>Launch Another Practice Interview</span>
          </button>
        </div>
      </div>
    </div>
  );
}
