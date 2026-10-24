import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import {
  Send,
  ChevronRight,
  Flag,
  Clock,
  Loader2,
  CheckCircle,
  Zap,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react';

function Timer({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) {
        setRemaining('00:00');
        setUrgent(true);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      setUrgent(diff < 5 * 60000);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!remaining) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        background: urgent ? 'var(--danger-bg)' : 'var(--bg-elevated)',
        border: `1px solid ${urgent ? 'var(--danger-border)' : 'var(--border)'}`,
        color: urgent ? 'var(--danger)' : 'var(--text-primary)',
        fontWeight: 700,
        fontSize: '14px',
        fontFamily: 'JetBrains Mono, monospace',
      }}
      title="Time remaining"
    >
      <Clock size={15} />
      <span>{remaining}</span>
    </div>
  );
}

export default function ActiveInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | starting | answering | evaluating | evaluated | completed
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [isEnding, setIsEnding] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const answerRef = useRef(null);
  const endingRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const preMicTextRef = useRef('');

  // ── Voice Hooks ──────────────────────────────────────────────────────
  const {
    transcript,
    listening,
    start: startListening,
    stop: stopListening,
    reset: resetTranscript,
    supported: speechRecSupported,
  } = useSpeechRecognition();

  const {
    speak,
    cancel: cancelSpeech,
    speaking,
    supported: speechSynthesisSupported,
  } = useSpeechSynthesis();

  // Keep live transcript updating textarea while remaining editable
  useEffect(() => {
    if (listening && transcript) {
      const base = preMicTextRef.current;
      const combined = base ? `${base.trim()} ${transcript}` : transcript;
      setAnswer(combined);
    }
  }, [transcript, listening]);

  // Voice mode: Read each new question aloud when ON
  useEffect(() => {
    if (voiceMode && question?.questionText && phase === 'answering') {
      speak(question.questionText);
    }
  }, [question, voiceMode, phase, speak]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopListening();
      cancelSpeech();
    };
  }, [stopListening, cancelSpeech]);

  // Load session
  useEffect(() => {
    interviewApi
      .getOne(id)
      .then((res) => {
        const s = res.data.session;
        setSession(s);
        setTotalQuestions(s.configuration?.questionCount || 10);
        const qs = res.data.questions || [];
        if (s.status === 'draft') {
          setPhase('starting');
        } else if (s.status === 'in_progress' && qs.length > 0) {
          const currentQ = qs[qs.length - 1];
          setQuestion(currentQ);
          setQuestionNum(qs.length);
          setPhase('answering');
          startTimeRef.current = Date.now();
        } else if (s.status === 'completed') {
          setPhase('completed');
        } else {
          setPhase('starting');
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error('Session not found or unavailable');
        navigate('/dashboard');
      });
  }, [id, navigate]);

  const startInterview = async () => {
    setPhase('loading');
    try {
      const res = await interviewApi.start(id);
      setSession(res.data.session);
      setQuestion(res.data.question);
      setQuestionNum(1);
      setPhase('answering');
      startTimeRef.current = Date.now();
      resetTranscript();
      setTimeout(() => answerRef.current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to start interview');
      setPhase('starting');
    }
  };

  const toggleMic = () => {
    if (!speechRecSupported) {
      toast.error('Speech recognition is not supported in this browser. Please type your answer.');
      return;
    }
    if (listening) {
      stopListening();
    } else {
      preMicTextRef.current = answer;
      resetTranscript();
      startListening();
    }
  };

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    setVoiceMode(next);
    if (!next) {
      cancelSpeech();
    } else if (question?.questionText) {
      speak(question.questionText);
    }
  };

  const handleRepeatQuestion = () => {
    if (question?.questionText) {
      speak(question.questionText);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) {
      toast.error('Please write an answer before submitting');
      return;
    }

    stopListening();
    cancelSpeech();

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
    const fillers = (answer.match(/\b(um|uh|like|you know)\b/gi) || []).length;

    setPhase('evaluating');
    try {
      // 1. Submit answer with timeTaken & fillerCount
      const submitRes = await interviewApi.submitAnswer(id, {
        questionId: question._id,
        answerText: answer,
        timeTaken: elapsedSeconds,
        fillerCount: fillers,
      });
      const answerId = submitRes.data.answer._id;

      // 2. Evaluate answer
      const evalRes = await interviewApi.evaluateAnswer(id, answerId);
      setEvaluation(evalRes.data.answer);
      setPhase('evaluated');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Evaluation failed. Please try again.');
      setPhase('answering');
    }
  };

  const finishInterview = async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setIsEnding(true);
    stopListening();
    cancelSpeech();
    try {
      await interviewApi.finish(id);
      toast.success('Interview ended. Generating your report...');
      navigate(`/reports/${id}`);
    } catch (err) {
      console.warn('POST /finish failed, falling back to /complete:', err);
      try {
        const res = await interviewApi.complete(id);
        navigate(`/reports/${res.data?.reportId || id}`);
      } catch (fErr) {
        toast.error(err.response?.data?.error?.message || err.message || 'Failed to complete session. Please try again.');
        endingRef.current = false;
        setIsEnding(false);
      }
    }
  };

  const nextQuestion = async () => {
    if (questionNum >= totalQuestions) {
      await finishInterview();
      return;
    }

    stopListening();
    cancelSpeech();
    setPhase('loading');
    setAnswer('');
    setEvaluation(null);
    preMicTextRef.current = '';
    resetTranscript();

    try {
      const res = await interviewApi.nextQuestion(id);
      setQuestion(res.data.question);
      setQuestionNum(res.data.questionNumber);
      setPhase('answering');
      startTimeRef.current = Date.now();
      setTimeout(() => answerRef.current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load next question');
      setPhase('evaluated');
    }
  };

  const endInterview = async () => {
    if (!window.confirm('Are you sure you want to conclude the interview now? Your submitted answers will be scored and saved.')) {
      return;
    }
    await finishInterview();
  };

  const scoreColor = (score) => {
    if (score == null) return 'var(--text-muted)';
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  const progress = Math.min(100, Math.round((questionNum / (totalQuestions || 1)) * 100));

  // 1. Loading Phase
  if (phase === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div className="spinner" />
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
            AI Interviewer Working
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Preparing your next technical question...
          </p>
        </div>
      </div>
    );
  }

  // 2. Starting Phase
  if (phase === 'starting') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          padding: '24px',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            padding: '36px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'var(--accent-subtle)',
              border: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--accent)',
            }}
          >
            <Zap size={32} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            Ready to Begin?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '18px' }}>
            You are about to start a practice technical interview for:
          </p>

          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {session?.configuration?.targetRole || 'Software Engineer'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '13px' }}>
              <span className="badge badge-accent">
                {session?.configuration?.questionCount || totalQuestions} Questions
              </span>
              <span className="badge badge-info">
                {session?.configuration?.timeLimitMinutes || 30} Minutes
              </span>
              <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                {session?.configuration?.difficulty || 'Medium'}
              </span>
              <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                {session?.configuration?.interviewType || 'Technical'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Exit to Dashboard
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={startInterview}
              id="start-interview-btn"
              style={{ gap: '8px' }}
            >
              <Zap size={18} /> Start Practice Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Completed Phase
  if (phase === 'completed') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          padding: '24px',
        }}
      >
        <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '36px' }}>
          <CheckCircle size={52} color="var(--success)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            Interview Already Concluded
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            This interview session is marked as completed. You can view your full diagnostic feedback report.
          </p>
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => navigate(`/reports/${id}`)}
            style={{ justifyContent: 'center' }}
          >
            View Evaluation Report
          </button>
        </div>
      </div>
    );
  }

  // 4. Active Answering & Evaluation Phase
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '60px' }}>
      {/* Top Session Bar */}
      <header
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 90,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '70px',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--gradient-accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '15px',
              }}
            >
              ⚡
            </span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {session?.configuration?.targetRole || 'Interview Session'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Question {questionNum} of {totalQuestions} • {session?.configuration?.difficulty || 'Medium'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Timer expiresAt={session?.expiresAt} />
            <ThemeToggle />
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={endInterview}
              disabled={isEnding}
              id="end-interview-btn"
              style={{ gap: '6px' }}
            >
              <Flag size={14} /> {isEnding ? 'Ending…' : 'End Interview'}
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div style={{ height: '3px', background: 'var(--bg-elevated)', width: '100%' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--gradient-accent)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container-narrow" style={{ paddingTop: '32px' }}>
        {/* Question Card */}
        {question && (
          <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-accent">Question {questionNum} of {totalQuestions}</span>
                {question.category && (
                  <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                    {question.category}
                  </span>
                )}
                {question.technology && (
                  <span className="badge badge-neutral">{question.technology}</span>
                )}
              </div>

              {/* Voice controls for question */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={toggleVoiceMode}
                  className={`btn btn-sm ${voiceMode ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: '6px', fontSize: '12px' }}
                  title="When Voice Mode is ON, the AI reads each new question aloud automatically."
                >
                  {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>Voice Mode: {voiceMode ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRepeatQuestion}
                  disabled={speaking}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px', fontSize: '12px' }}
                  title="Read question aloud"
                >
                  <RotateCcw size={13} />
                  <span>{speaking ? 'Reading...' : 'Repeat Question'}</span>
                </button>
              </div>
            </div>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                lineHeight: 1.5,
                color: 'var(--text-primary)',
              }}
            >
              {question.questionText}
            </h2>
          </div>
        )}

        {/* Answer Input Area */}
        {(phase === 'answering' || phase === 'evaluating') && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label htmlFor="answer-textarea" className="form-label" style={{ margin: 0 }}>
                Your Technical Response
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Mic button with pulsing animation */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`btn btn-sm ${listening ? 'btn-danger' : 'btn-secondary'}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '6px 14px',
                    background: listening ? '#ef4444' : undefined,
                    color: listening ? '#ffffff' : undefined,
                    boxShadow: listening ? '0 0 14px rgba(239, 68, 68, 0.6)' : undefined,
                    animation: listening ? 'pulse 1.5s infinite' : undefined,
                    transition: 'all 0.2s ease',
                  }}
                  id="mic-btn"
                  title={listening ? 'Click to stop listening' : 'Click to speak your answer'}
                >
                  {listening ? <MicOff size={15} /> : <Mic size={15} />}
                  <span>{listening ? 'Listening... (Stop)' : 'Voice Input'}</span>
                </button>

                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {answer.length} chars • Markdown welcome
                </span>
              </div>
            </div>

            {!speechRecSupported && (
              <div style={{ marginBottom: '10px', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Speech recognition is not supported in this browser. You can type your answer below.
              </div>
            )}

            {listening && (
              <div style={{ marginBottom: '10px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#ef4444' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                <span>Microphone active: Speaking live into your answer. You can edit text freely below anytime.</span>
              </div>
            )}

            <textarea
              ref={answerRef}
              className="answer-editor"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Provide a structured, comprehensive answer with architectural decisions, trade-offs, and examples... (You can speak or type freely)"
              disabled={phase === 'evaluating'}
              id="answer-textarea"
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                💡 Tip: Explain <strong>why</strong>, not just <strong>what</strong>, to score higher in Depth and Clarity.
              </span>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submitAnswer}
                  disabled={phase === 'evaluating' || !answer.trim()}
                  id="submit-answer-btn"
                  style={{ gap: '8px' }}
                >
                  {phase === 'evaluating' ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Evaluating with Multi-LLM...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Submit Answer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instant Evaluation Card */}
        {phase === 'evaluated' && evaluation && (
          <div
            className="card"
            style={{
              marginBottom: '24px',
              background: 'var(--gradient-card)',
              borderColor: 'var(--border-accent)',
              boxShadow: 'var(--shadow-card-hover)',
            }}
          >
            {/* Overall Score Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Evaluation Complete</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Immediate multi-criteria assessment by AI evaluator
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '38px',
                    fontWeight: 800,
                    color: scoreColor(evaluation.overallScore),
                    lineHeight: 1,
                  }}
                >
                  {evaluation.overallScore ?? '—'}
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    /100
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Question Score
                </div>
              </div>
            </div>

            {/* Criteria Breakdown Grid */}
            {evaluation.evaluation && (
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Score by Evaluation Criteria:
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {Object.entries(evaluation.evaluation).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        textAlign: 'center',
                        background: 'var(--bg-elevated)',
                        borderRadius: '10px',
                        padding: '12px 8px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          color: scoreColor(val),
                        }}
                      >
                        {val}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          textTransform: 'capitalize',
                          marginTop: '2px',
                        }}
                      >
                        {key}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Feedback Text */}
            {evaluation.detailedFeedback && (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  fontSize: '14.5px',
                  lineHeight: 1.7,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  AI Examiner Assessment:
                </div>
                {evaluation.detailedFeedback}
              </div>
            )}

            {/* Strengths & Improvements */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {evaluation.strengths?.length > 0 && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--success-border)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--success)',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      marginBottom: '10px',
                    }}
                  >
                    <CheckCircle2 size={16} /> Key Strengths
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {evaluation.strengths.map((s, idx) => (
                      <li key={idx} style={{ marginBottom: '6px', lineHeight: 1.5 }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.improvements?.length > 0 && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--warning-border)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--warning)',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      marginBottom: '10px',
                    }}
                  >
                    <TrendingUp size={16} /> Recommended Improvements
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {evaluation.improvements.map((s, idx) => (
                      <li key={idx} style={{ marginBottom: '6px', lineHeight: 1.5 }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Next Action Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={nextQuestion}
                id="next-question-btn"
                style={{ gap: '8px' }}
              >
                {questionNum >= totalQuestions ? (
                  <>
                    <CheckCircle size={18} /> Complete Interview & View Report
                  </>
                ) : (
                  <>
                    <span>Next Question ({questionNum + 1}/{totalQuestions})</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
