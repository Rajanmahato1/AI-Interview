const { v4: uuidv4 } = require('uuid');
const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
const InterviewAnswer = require('../models/InterviewAnswer');
const InterviewReport = require('../models/InterviewReport');
const ai = require('../services/ai/aiProviderManager');
const { AppError } = require('../middleware/errorHandler');

// ── Score calculator ─────────────────────────────────────────────────
function calcOverallScore(evaluation) {
  if (!evaluation) return null;
  const { correctness = 0, clarity = 0, depth = 0, structure = 0, relevance = 0 } = evaluation;
  return Math.round((correctness + clarity + depth + structure + relevance) / 5);
}

// ── POST /api/interviews ─────────────────────────────────────────────
const createSession = async (req, res, next) => {
  try {
    const { targetRole, experienceLevel, interviewType, difficulty, companyType, technologies, questionCount, timeLimitMinutes, jobDescription, resumeText, adaptiveEnabled } = req.body;
    if (!targetRole || !experienceLevel || !interviewType || !difficulty) {
      throw new AppError('targetRole, experienceLevel, interviewType and difficulty are required', 400, 'MISSING_FIELDS');
    }
    const qCount = Math.min(Math.max(parseInt(questionCount) || 10, 1), 30);
    const timeLimit = Math.min(Math.max(parseInt(timeLimitMinutes) || 30, 5), 120);

    const session = await InterviewSession.create({
      userId: req.user._id,
      configuration: {
        targetRole: targetRole.trim(),
        experienceLevel,
        interviewType,
        difficulty,
        companyType: companyType || 'product',
        technologies: Array.isArray(technologies) ? technologies : [],
        questionCount: qCount,
        timeLimitMinutes: timeLimit,
        jobDescription: jobDescription || '',
        resumeText: resumeText || '',
        adaptiveEnabled: !!adaptiveEnabled,
      },
    });
    res.status(201).json({ success: true, session });
  } catch (err) { next(err); }
};

// ── GET /api/interviews ──────────────────────────────────────────────
const getSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, status, sort = '-createdAt' } = req.query;
    const query = { userId: req.user._id };
    if (type) query['configuration.interviewType'] = type;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sessions, total] = await Promise.all([
      InterviewSession.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      InterviewSession.countDocuments(query),
    ]);
    res.json({ success: true, sessions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
};

// ── GET /api/interviews/:id ──────────────────────────────────────────
const getSession = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    const questions = await InterviewQuestion.find({ sessionId: session._id }).sort('order');
    res.json({ success: true, session, questions });
  } catch (err) { next(err); }
};

// ── POST /api/interviews/:id/start ──────────────────────────────────
const startSession = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');

    if (['completed', 'cancelled'].includes(session.status)) {
      throw new AppError(`Cannot start a session in status: ${session.status}`, 400, 'INVALID_STATUS');
    }

    // If already in_progress, check if first question exists to resume seamlessly
    if (session.status === 'in_progress') {
      const existingFirstQ = await InterviewQuestion.findOne({ sessionId: session._id, order: 1 });
      if (existingFirstQ) {
        return res.json({ success: true, session, question: existingFirstQ });
      }
    }

    const previousStatus = session.status;
    const now = new Date();
    session.status = 'in_progress';
    if (!session.startedAt) session.startedAt = now;
    session.expiresAt = new Date(now.getTime() + (session.configuration.timeLimitMinutes || 30) * 60 * 1000);
    await session.save();

    let qResult;
    try {
      // Generate first question
      const previousQuestions = [];
      qResult = await ai.generateInterviewQuestion({
        role: session.configuration.targetRole,
        experienceLevel: session.configuration.experienceLevel,
        interviewType: session.configuration.interviewType,
        difficulty: session.configuration.difficulty,
        companyType: session.configuration.companyType,
        technologies: session.configuration.technologies,
        jobDescription: session.configuration.jobDescription,
        resumeText: session.configuration.resumeText,
        previousQuestions,
        questionNumber: 1,
        totalQuestions: session.configuration.questionCount,
      });
    } catch (aiErr) {
      if (previousStatus === 'draft') {
        session.status = 'draft';
        await session.save();
      }
      throw aiErr;
    }

    const question = await InterviewQuestion.create({
      sessionId: session._id,
      questionText: qResult.data.questionText,
      category: qResult.data.category || 'technical',
      difficulty: session.configuration.difficulty,
      technology: qResult.data.technology || '',
      order: 1,
      expectedConcepts: qResult.data.expectedConcepts || [],
      providerUsed: qResult.provider,
      modelUsed: qResult.model,
    });

    session.questionCount = 1;
    await session.save();

    res.json({ success: true, session, question });
  } catch (err) { next(err); }
};

// ── POST /api/interviews/:id/next-question ───────────────────────────
const nextQuestion = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (session.status !== 'in_progress') throw new AppError('Session is not in progress', 400, 'INVALID_STATUS');

    // Check time limit
    if (session.expiresAt && new Date() > session.expiresAt) {
      session.status = 'interrupted';
      await session.save();
      throw new AppError('Interview time has expired', 400, 'SESSION_EXPIRED');
    }

    const existingQuestions = await InterviewQuestion.find({ sessionId: session._id }).sort('order');
    const currentCount = existingQuestions.length;

    if (currentCount >= session.configuration.questionCount) {
      throw new AppError('All questions have been generated', 400, 'MAX_QUESTIONS_REACHED');
    }

    const previousQTexts = existingQuestions.map(q => q.questionText);
    const qResult = await ai.generateInterviewQuestion({
      role: session.configuration.targetRole,
      experienceLevel: session.configuration.experienceLevel,
      interviewType: session.configuration.interviewType,
      difficulty: session.configuration.difficulty,
      companyType: session.configuration.companyType,
      technologies: session.configuration.technologies,
      jobDescription: session.configuration.jobDescription,
      resumeText: session.configuration.resumeText,
      previousQuestions: previousQTexts,
      questionNumber: currentCount + 1,
      totalQuestions: session.configuration.questionCount,
    });

    const question = await InterviewQuestion.create({
      sessionId: session._id,
      questionText: qResult.data.questionText,
      category: qResult.data.category || 'technical',
      difficulty: session.configuration.difficulty,
      technology: qResult.data.technology || '',
      order: currentCount + 1,
      expectedConcepts: qResult.data.expectedConcepts || [],
      providerUsed: qResult.provider,
      modelUsed: qResult.model,
    });

    session.questionCount = currentCount + 1;
    await session.save();

    res.json({ success: true, question, questionNumber: currentCount + 1, totalQuestions: session.configuration.questionCount });
  } catch (err) { next(err); }
};

// ── POST /api/interviews/:id/answers ────────────────────────────────
const submitAnswer = async (req, res, next) => {
  try {
    const { questionId, answerText, idempotencyKey } = req.body;
    if (!questionId || !answerText) throw new AppError('questionId and answerText are required', 400, 'MISSING_FIELDS');

    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (session.status !== 'in_progress') throw new AppError('Session is not in progress', 400, 'INVALID_STATUS');

    // Check for existing answer (idempotency)
    if (idempotencyKey) {
      const existing = await InterviewAnswer.findOne({ idempotencyKey });
      if (existing) return res.json({ success: true, answer: existing, duplicate: true });
    }

    // Verify question belongs to session
    const question = await InterviewQuestion.findOne({ _id: questionId, sessionId: session._id });
    if (!question) throw new AppError('Question not found in this session', 404, 'NOT_FOUND');

    // Check for duplicate
    const dupAnswer = await InterviewAnswer.findOne({ sessionId: session._id, questionId });
    if (dupAnswer) return res.json({ success: true, answer: dupAnswer, duplicate: true });

    const answer = await InterviewAnswer.create({
      sessionId: session._id,
      questionId,
      answerText: answerText.trim(),
      evaluationStatus: 'pending',
      idempotencyKey: idempotencyKey || uuidv4(),
    });

    res.status(201).json({ success: true, answer });
  } catch (err) { next(err); }
};

// ── POST /api/interviews/:id/answers/:answerId/evaluate ──────────────
const evaluateAnswer = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');

    const answer = await InterviewAnswer.findOne({ _id: req.params.answerId, sessionId: session._id });
    if (!answer) throw new AppError('Answer not found', 404, 'NOT_FOUND');

    if (answer.evaluationStatus === 'completed') {
      return res.json({ success: true, answer });
    }

    const question = await InterviewQuestion.findById(answer.questionId);
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND');

    answer.evaluationStatus = 'evaluating';
    await answer.save();

    try {
      const evalResult = await ai.evaluateInterviewAnswer({
        questionText: question.questionText,
        answerText: answer.answerText,
        expectedConcepts: question.expectedConcepts,
        role: session.configuration.targetRole,
        experienceLevel: session.configuration.experienceLevel,
        difficulty: session.configuration.difficulty,
        interviewType: session.configuration.interviewType,
        technologies: session.configuration.technologies,
      });

      const evalData = evalResult.data;
      answer.evaluation = evalData.evaluation;
      answer.overallScore = calcOverallScore(evalData.evaluation);
      answer.strengths = evalData.strengths || [];
      answer.weaknesses = evalData.weaknesses || [];
      answer.improvements = evalData.improvements || [];
      answer.idealAnswer = evalData.idealAnswer || '';
      answer.detailedFeedback = evalData.detailedFeedback || '';
      answer.evaluationStatus = 'completed';
      answer.evaluatedAt = new Date();
      answer.providerUsed = evalResult.provider;
      answer.modelUsed = evalResult.model;
      await answer.save();

      res.json({ success: true, answer });
    } catch (evalErr) {
      answer.evaluationStatus = 'failed';
      await answer.save();
      throw evalErr;
    }
  } catch (err) { next(err); }
};

// ── POST /api/interviews/:id/complete ───────────────────────────────
const completeSession = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (!['in_progress', 'evaluating'].includes(session.status)) {
      throw new AppError(`Cannot complete a session in status: ${session.status}`, 400, 'INVALID_STATUS');
    }

    // Calculate overall score from completed answers
    const answers = await InterviewAnswer.find({ sessionId: session._id, evaluationStatus: 'completed' });
    const scores = answers.filter(a => a.overallScore !== null).map(a => a.overallScore);
    const overallScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    session.status = 'completed';
    session.completedAt = new Date();
    session.overallScore = overallScore;
    session.reportStatus = 'pending';
    await session.save();

    // Generate report asynchronously
    generateReportAsync(session, answers).catch(err => console.error('[REPORT_GEN]', err.message));

    res.json({ success: true, session });
  } catch (err) { next(err); }
};

// ── POST /api/interviews/:id/resume ─────────────────────────────────
const resumeSession = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (session.status !== 'interrupted') throw new AppError('Only interrupted sessions can be resumed', 400, 'INVALID_STATUS');
    if (session.expiresAt && new Date() > session.expiresAt) throw new AppError('Session has expired and cannot be resumed', 400, 'SESSION_EXPIRED');

    session.status = 'in_progress';
    await session.save();
    const questions = await InterviewQuestion.find({ sessionId: session._id }).sort('order');
    res.json({ success: true, session, questions });
  } catch (err) { next(err); }
};

// ── DELETE /api/interviews/:id ───────────────────────────────────────
const deleteSession = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');

    await Promise.all([
      InterviewQuestion.deleteMany({ sessionId: session._id }),
      InterviewAnswer.deleteMany({ sessionId: session._id }),
      InterviewReport.deleteMany({ sessionId: session._id }),
      session.deleteOne(),
    ]);

    res.json({ success: true, message: 'Interview deleted' });
  } catch (err) { next(err); }
};

// ── Async report generation ──────────────────────────────────────────
async function generateReportAsync(session, answers) {
  // Check for existing report to prevent duplicates
  const existing = await InterviewReport.findOne({ sessionId: session._id });
  if (existing && existing.reportStatus === 'completed') return;

  const report = existing || new InterviewReport({ sessionId: session._id, userId: session.userId, reportStatus: 'generating' });
  await report.save();

  try {
    const questions = await InterviewQuestion.find({ sessionId: session._id }).sort('order');
    const qMap = Object.fromEntries(questions.map(q => [String(q._id), q]));

    const answerSummaries = answers.map(a => ({
      questionText: qMap[String(a.questionId)]?.questionText || '',
      overallScore: a.overallScore,
      detailedFeedback: a.detailedFeedback,
      strengths: a.strengths,
      weaknesses: a.weaknesses,
    }));

    const duration = session.completedAt && session.startedAt
      ? Math.round((session.completedAt - session.startedAt) / 60000) : session.configuration.timeLimitMinutes;

    const rResult = await ai.generateInterviewReport({
      role: session.configuration.targetRole,
      experienceLevel: session.configuration.experienceLevel,
      interviewType: session.configuration.interviewType,
      answers: answerSummaries,
      sessionDuration: duration,
    });

    const rData = rResult.data;

    // Calculate section scores deterministically
    const techAnswers = answers.filter((_, i) => ['technical', 'coding', 'system_design'].includes(questions[i]?.category));
    const behAnswers = answers.filter((_, i) => ['behavioral', 'hr'].includes(questions[i]?.category));
    const calcAvg = (arr) => arr.length ? Math.round(arr.reduce((s, a) => s + (a.overallScore || 0), 0) / arr.length) : null;

    report.overallScore = session.overallScore;
    report.sectionScores = {
      technical: calcAvg(techAnswers),
      behavioral: calcAvg(behAnswers),
      communication: answers.length ? Math.round(answers.reduce((s, a) => s + (a.evaluation?.clarity || 0), 0) / answers.length) : null,
      problemSolving: answers.length ? Math.round(answers.reduce((s, a) => s + (a.evaluation?.depth || 0), 0) / answers.length) : null,
    };
    report.strengths = rData.strengths || [];
    report.weaknesses = rData.weaknesses || [];
    report.improvements = rData.improvements || [];
    report.missingConcepts = rData.missingConcepts || [];
    report.suggestedTopics = rData.suggestedTopics || [];
    report.recommendedPractice = rData.recommendedPractice || [];
    report.detailedFeedback = rData.detailedFeedback || '';
    report.performanceSummary = rData.performanceSummary || '';
    report.nextSteps = rData.nextSteps || [];
    report.reportStatus = 'completed';
    report.generatedAt = new Date();
    report.providerUsed = rResult.provider;
    report.modelUsed = rResult.model;
    await report.save();

    session.reportStatus = 'completed';
    await session.save();
  } catch (err) {
    report.reportStatus = 'failed';
    await report.save();
    session.reportStatus = 'failed';
    await session.save();
    throw err;
  }
}

module.exports = { createSession, getSessions, getSession, startSession, nextQuestion, submitAnswer, evaluateAnswer, completeSession, resumeSession, deleteSession };
