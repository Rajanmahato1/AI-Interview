import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';
import toast from 'react-hot-toast';
import { Send, ChevronRight, Flag, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function Timer({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) { setRemaining('00:00'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      setUrgent(diff < 5 * 60000);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: urgent ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '16px', fontFamily: 'JetBrains Mono, monospace' }}>
      <Clock size={16} /> {remaining}
    </div>
  );
}

export default function ActiveInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | starting | answering | evaluating | evaluated | completed
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [submittedAnswerId, setSubmittedAnswerId] = useState(null);
  const answerRef = useRef(null);

  // Load session
  useEffect(() => {
    interviewApi.getOne(id)
      .then(res => {
        const s = res.data.session;
        setSession(s);
        setTotalQuestions(s.configuration.questionCount);
        const qs = res.data.questions || [];
        setQuestions(qs);
        if (s.status === 'draft') {
          setPhase('starting');
        } else if (s.status === 'in_progress' && qs.length > 0) {
          setQuestion(qs[qs.length - 1]);
          setQuestionNum(qs.length);
          setPhase('answering');
        } else if (s.status === 'completed') {
          setPhase('completed');
        } else {
          setPhase('starting');
        }
      })
      .catch(() => { toast.error('Session not found'); navigate('/dashboard'); });
  }, [id]);

  const startInterview = async () => {
    setPhase('loading');
    try {
      const res = await interviewApi.start(id);
      setSession(res.data.session);
      setQuestion(res.data.question);
      setQuestions([res.data.question]);
      setQuestionNum(1);
      setPhase('answering');
      answerRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to start interview');
      setPhase('starting');
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) { toast.error('Please write an answer'); return; }
    setPhase('evaluating');
    try {
      // Submit
      const submitRes = await interviewApi.submitAnswer(id, { questionId: question._id, answerText: answer });
      const answerId = submitRes.data.answer._id;
      setSubmittedAnswerId(answerId);

      // Evaluate
      const evalRes = await interviewApi.evaluateAnswer(id, answerId);
      setEvaluation(evalRes.data.answer);
      setPhase('evaluated');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Evaluation failed');
      setPhase('answering');
    }
  };

  const nextQuestion = async () => {
    if (questionNum >= totalQuestions) {
      // Complete
      try {
        await interviewApi.complete(id);
        toast.success('Interview completed! Generating report...');
        navigate(`/history`);
      } catch { toast.error('Failed to complete session'); }
      return;
    }
    setPhase('loading');
    setAnswer('');
    setEvaluation(null);
    try {
      const res = await interviewApi.nextQuestion(id);
      setQuestion(res.data.question);
      setQuestions(prev => [...prev, res.data.question]);
      setQuestionNum(res.data.questionNumber);
      setPhase('answering');
      answerRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load next question');
      setPhase('evaluated');
    }
  };

  const endInterview = async () => {
    if (!window.confirm('End the interview now? Your current progress will be saved.')) return;
    try {
      await interviewApi.complete(id);
      toast.success('Interview ended. Generating report...');
      navigate('/history');
    } catch { navigate('/history'); }
  };

  const scoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  const progress = Math.round((questionNum / totalQuestions) * 100);

  if (phase === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: '16px' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)' }}>Loading interview...</p>
    </div>
  );

  if (phase === 'starting') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="card" style={{ maxWidth: '480px', textAlign: 'center' }}>
        <span style={{ fontSize: '48px' }}>🎯</span>
        <h2 style={{ fontSize: '24px', margin: '16px 0 8px' }}>Ready to Start?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}><strong>{session?.configuration?.targetRole}</strong></p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
          {totalQuestions} questions · {session?.configuration?.timeLimitMinutes} min · {session?.configuration?.difficulty} difficulty
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Cancel</button>
          <button className="btn btn-primary btn-lg" onClick={startInterview} id="start-interview-btn">
            <Zap size={18} /> Start Interview
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 24px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{session?.configuration?.targetRole}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {session?.configuration?.interviewType} · {session?.configuration?.difficulty} · Q{questionNum}/{totalQuestions}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Timer expiresAt={session?.expiresAt} />
          <button className="btn btn-danger btn-sm" onClick={endInterview} id="end-interview-btn"><Flag size={14} /> End</button>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bar" style={{ marginBottom: '32px' }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      {question && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span className="badge badge-accent">Q{questionNum}</span>
            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{question.category}</span>
            {question.technology && <span className="badge badge-accent">{question.technology}</span>}
          </div>
          <p style={{ fontSize: '18px', lineHeight: 1.7, color: 'var(--text-primary)' }}>{question.questionText}</p>
        </div>
      )}

      {/* Answer area */}
      {(phase === 'answering' || phase === 'evaluating') && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>Your Answer</label>
          <textarea
            ref={answerRef}
            className="answer-editor"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer here... Be as detailed and specific as possible."
            disabled={phase === 'evaluating'}
            id="answer-textarea"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={endInterview}>End Early</button>
            <button className="btn btn-primary" onClick={submitAnswer} disabled={phase === 'evaluating' || !answer.trim()} id="submit-answer-btn">
              {phase === 'evaluating' ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...</> : <><Send size={16} /> Submit Answer</>}
            </button>
          </div>
        </div>
      )}

      {/* Evaluation result */}
      {phase === 'evaluated' && evaluation && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <CheckCircle size={24} color="var(--success)" />
            <h3 style={{ fontSize: '18px' }}>Evaluation Complete</h3>
            <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: scoreColor(evaluation.overallScore) }}>{evaluation.overallScore ?? '—'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overall Score</div>
            </div>
          </div>

          {/* Scores grid */}
          {evaluation.evaluation && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {Object.entries(evaluation.evaluation).map(([key, val]) => (
                <div key={key} style={{ textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: scoreColor(val) }}>{val}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '4px' }}>{key}</div>
                </div>
              ))}
            </div>
          )}

          {evaluation.detailedFeedback && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {evaluation.detailedFeedback}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {evaluation.strengths?.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)', marginBottom: '8px' }}>✓ Strengths</p>
                <ul style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {evaluation.strengths.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
                </ul>
              </div>
            )}
            {evaluation.improvements?.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)', marginBottom: '8px' }}>↑ Improvements</p>
                <ul style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {evaluation.improvements.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={nextQuestion} id="next-question-btn">
              {questionNum >= totalQuestions ? <><CheckCircle size={16} /> Complete Interview</> : <><ChevronRight size={16} /> Next Question</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Import Zap for starting card
function Zap({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
