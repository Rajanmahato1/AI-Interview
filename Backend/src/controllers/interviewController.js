const mongoose = require('mongoose');
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
    const reports = await InterviewReport.find({
      userId: req.user._id,
      sessionId: { $in: sessions.map(session => session._id) },
    }).select('_id sessionId');
    const reportBySession = new Map(reports.map(report => [String(report.sessionId), report]));
    const sessionsWithReports = sessions.map(session => ({
      ...session.toObject(),
      report: reportBySession.get(String(session._id)) || null,
    }));
    res.json({ success: true, sessions: sessionsWithReports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
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
    const { questionId, answerText, idempotencyKey, timeTaken, fillerCount } = req.body;
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
      timeTaken: Number(timeTaken) || 0,
      fillerCount: Number(fillerCount) || 0,
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
    if (session.status !== 'completed' && !['in_progress', 'evaluating'].includes(session.status)) {
      throw new AppError(`Cannot complete a session in status: ${session.status}`, 400, 'INVALID_STATUS');
    }

    const answers = await InterviewAnswer.find({ sessionId: session._id }).sort('submittedAt');
    if (answers.length === 0) {
      throw new AppError('Submit at least one answer before ending the interview.', 409, 'MISSING_INTERVIEW_DATA');
    }
    if (answers.some(answer => answer.evaluationStatus === 'evaluating')) {
      throw new AppError('An answer is still being evaluated. Please wait and try again.', 409, 'ANSWERS_EVALUATING');
    }

    if (session.status !== 'completed') {
      const scores = answers.filter(a => a.evaluationStatus === 'completed' && a.overallScore != null).map(a => a.overallScore);
      session.status = 'completed';
      session.completedAt = new Date();
      session.overallScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      session.reportStatus = 'pending';
      await session.save();
    }

    const isRetry = Boolean(req.body?.retry || req.query?.retry === 'true');
    const report = await queueReportGeneration(session, answers, { force: isRetry });
    const reportStatus = report.reportStatus === 'generating' ? 'processing' : report.reportStatus;

    res.status(reportStatus === 'completed' ? 200 : 202).json({
      success: true,
      session,
      sessionId: String(session._id),
      reportId: String(report._id),
      reportStatus,
    });
  } catch (err) { next(err); }
};

// ── POST /api/interviews/:id/finish (TASK 1) ────────────────────────
const finishSession = async (req, res, next) => {
  try {
    console.log(`[FINISH_SESSION] Finish requested: id=${req.params.id}, userId=${req.user?._id}`);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`[FINISH_SESSION] Invalid ID format: ${req.params.id}`);
      throw new AppError(`Invalid interview ID: ${req.params.id}`, 400, 'INVALID_ID');
    }

    let session = await InterviewSession.findById(req.params.id);
    if (!session) {
      const reportDoc = await InterviewReport.findById(req.params.id);
      if (reportDoc && reportDoc.sessionId) {
        session = await InterviewSession.findById(reportDoc.sessionId);
      }
    }

    if (!session) {
      console.log(`[FINISH_SESSION] Session not found: ${req.params.id}`);
      throw new AppError('Interview session not found', 404, 'NOT_FOUND');
    }

    const sessionUserId = session.userId ? session.userId.toString() : '';
    const reqUserId = req.user._id ? req.user._id.toString() : '';

    if (sessionUserId !== reqUserId) {
      console.log(`[FINISH_SESSION] Forbidden: session owned by ${sessionUserId}, caller is ${reqUserId}`);
      throw new AppError('You are not authorized to finish this interview', 403, 'FORBIDDEN');
    }

    const [questions, answers] = await Promise.all([
      InterviewQuestion.find({ sessionId: session._id }).sort('order'),
      InterviewAnswer.find({ sessionId: session._id }).sort('submittedAt'),
    ]);

    const questionMap = new Map(questions.map(q => [String(q._id), q]));

    let scoreSum = 0;
    let scoredCount = 0;

    const qa = answers.map((ans, idx) => {
      const q = questionMap.get(String(ans.questionId));
      const qText = q?.questionText || `Question ${idx + 1}`;
      let score10 = null;
      if (typeof ans.overallScore === 'number' && !isNaN(ans.overallScore)) {
        score10 = ans.overallScore > 10 ? Math.round(ans.overallScore / 10) : Math.round(ans.overallScore);
        scoreSum += score10;
        scoredCount++;
      }
      return {
        question: qText,
        answer: ans.answerText || '',
        feedback: ans.detailedFeedback || (ans.strengths?.length ? ans.strengths.join('; ') : 'Answer evaluated.'),
        score: score10,
        timeTaken: ans.timeTaken || 0,
        fillerCount: ans.fillerCount || 0,
      };
    });

    const computedTotalScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : 7;

    const reportData = await ai.generateReport({
      role: session.configuration?.targetRole || 'Software Engineer',
      type: session.configuration?.interviewType || 'Technical',
      difficulty: session.configuration?.difficulty || 'Medium',
      qa,
    });

    const finalScore = typeof reportData.overallScore === 'number' ? reportData.overallScore : computedTotalScore;

    const reportObj = {
      overallScore: finalScore,
      summary: reportData.summary,
      strengths: reportData.strengths || [],
      weakAreas: reportData.weakAreas || [],
      tips: reportData.tips || [],
      perQuestion: reportData.perQuestion || [],
      generatedAt: new Date(),
    };

    // Save atomically using findByIdAndUpdate
    const updatedSession = await InterviewSession.findByIdAndUpdate(
      session._id,
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          totalScore: finalScore,
          overallScore: finalScore * 10,
          qa: qa,
          report: reportObj,
          reportStatus: 'completed',
        },
      },
      { new: true }
    );

    console.log(`[FINISH_SESSION] Successfully finished & saved report: sessionId=${updatedSession._id}, totalScore=${finalScore}`);

    // Sync InterviewReport collection for backwards compatibility
    try {
      await InterviewReport.findOneAndUpdate(
        { sessionId: session._id, userId: session.userId },
        {
          $set: {
            overallScore: finalScore * 10,
            performanceSummary: reportData.summary,
            strengths: reportData.strengths || [],
            weaknesses: reportData.weakAreas || [],
            improvements: reportData.tips || [],
            reportStatus: 'completed',
            generatedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (rErr) {
      console.warn('[REPORT_SYNC_WARN]', rErr.message);
    }

    res.json({
      success: true,
      report: updatedSession.report,
      session: updatedSession,
      totalScore: finalScore,
    });
  } catch (err) { next(err); }
};

// ── GET /api/interviews/:id/report (TASK 1) ─────────────────────────
const getInterviewReport = async (req, res, next) => {
  try {
    console.log(`[GET_REPORT] Report requested: id=${req.params.id}, userId=${req.user?._id}`);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`[GET_REPORT] Invalid interview ID format: ${req.params.id}`);
      throw new AppError(`Invalid interview ID: ${req.params.id}`, 400, 'INVALID_ID');
    }

    let session = await InterviewSession.findById(req.params.id);

    // If not found directly, check if id was an InterviewReport ID
    if (!session) {
      const reportDoc = await InterviewReport.findById(req.params.id);
      if (reportDoc && reportDoc.sessionId) {
        session = await InterviewSession.findById(reportDoc.sessionId);
        console.log(`[GET_REPORT] Resolved session ${session?._id} via InterviewReport ${req.params.id}`);
      }
    }

    if (!session) {
      console.log(`[GET_REPORT] Interview session not found: ${req.params.id}`);
      throw new AppError(`Interview session with ID ${req.params.id} was not found.`, 404, 'NOT_FOUND');
    }

    const sessionUserId = session.userId ? session.userId.toString() : '';
    const reqUserId = req.user._id ? req.user._id.toString() : '';

    console.log(`[GET_REPORT] Checking ownership: session.userId=${sessionUserId}, req.user._id=${reqUserId}`);

    if (sessionUserId !== reqUserId) {
      console.log(`[GET_REPORT] Forbidden: session owned by ${sessionUserId}, requested by ${reqUserId}`);
      throw new AppError('You are not authorized to view this interview report.', 403, 'FORBIDDEN');
    }

    const hasReport = Boolean(session.report && session.report.summary);
    console.log(`[GET_REPORT] Found session ${session._id}: status=${session.status}, hasReport=${hasReport}`);

    // If report already exists and is complete, return it immediately
    if (hasReport) {
      console.log(`[GET_REPORT] Returning existing report for session ${session._id}`);
      return res.json({
        success: true,
        report: session.report,
        session,
        qa: session.qa || [],
      });
    }

    // If report is missing for completed (or past) interview, generate it on demand
    const [questions, answers] = await Promise.all([
      InterviewQuestion.find({ sessionId: session._id }).sort('order'),
      InterviewAnswer.find({ sessionId: session._id }).sort('submittedAt'),
    ]);
    const questionMap = new Map(questions.map(q => [String(q._id), q]));

    let scoreSum = 0;
    let scoredCount = 0;

    const qa = answers.map((ans, idx) => {
      const q = questionMap.get(String(ans.questionId));
      const qText = q?.questionText || `Question ${idx + 1}`;
      let score10 = null;
      if (typeof ans.overallScore === 'number' && !isNaN(ans.overallScore)) {
        score10 = ans.overallScore > 10 ? Math.round(ans.overallScore / 10) : Math.round(ans.overallScore);
        scoreSum += score10;
        scoredCount++;
      }
      return {
        question: qText,
        answer: ans.answerText || '',
        feedback: ans.detailedFeedback || (ans.strengths?.length ? ans.strengths.join('; ') : 'Answer evaluated.'),
        score: score10,
        timeTaken: ans.timeTaken || 0,
        fillerCount: ans.fillerCount || 0,
      };
    });

    // Check if session has answers or is completed or has questions
    if (session.status === 'completed' || answers.length > 0 || questions.length > 0) {
      console.log(`[GET_REPORT] Generating missing report on demand for session ${session._id}...`);
      const computedTotalScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : 7;

      const reportData = await ai.generateReport({
        role: session.configuration?.targetRole || 'Software Engineer',
        type: session.configuration?.interviewType || 'Technical',
        difficulty: session.configuration?.difficulty || 'Medium',
        qa,
      });

      const finalScore = typeof reportData.overallScore === 'number' ? reportData.overallScore : computedTotalScore;

      const generatedReport = {
        overallScore: finalScore,
        summary: reportData.summary,
        strengths: reportData.strengths || [],
        weakAreas: reportData.weakAreas || [],
        tips: reportData.tips || [],
        perQuestion: reportData.perQuestion || [],
        generatedAt: new Date(),
      };

      const updatedSession = await InterviewSession.findByIdAndUpdate(
        session._id,
        {
          $set: {
            status: 'completed',
            completedAt: session.completedAt || new Date(),
            totalScore: finalScore,
            overallScore: finalScore * 10,
            qa: qa,
            report: generatedReport,
            reportStatus: 'completed',
          },
        },
        { new: true }
      );

      console.log(`[GET_REPORT] Successfully generated and saved report on demand for session ${session._id}`);

      // Sync InterviewReport
      try {
        await InterviewReport.findOneAndUpdate(
          { sessionId: session._id, userId: session.userId },
          {
            $set: {
              overallScore: finalScore * 10,
              performanceSummary: reportData.summary,
              strengths: reportData.strengths || [],
              weaknesses: reportData.weakAreas || [],
              improvements: reportData.tips || [],
              reportStatus: 'completed',
              generatedAt: new Date(),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (rErr) {
        console.warn('[REPORT_SYNC_WARN]', rErr.message);
      }

      return res.json({
        success: true,
        report: updatedSession.report,
        session: updatedSession,
        qa: updatedSession.qa,
      });
    }

    console.log(`[GET_REPORT] Session ${session._id} is in draft with no answers yet.`);
    res.status(202).json({
      success: true,
      reportStatus: session.reportStatus || 'pending',
      message: 'Interview is not completed yet.',
    });
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
const REPORT_STALE_AFTER_MS = 5 * 60 * 1000;

async function queueReportGeneration(session, answers, options = {}) {
  const force = Boolean(options.force);
  let report;
  try {
    report = await InterviewReport.findOneAndUpdate(
      { sessionId: session._id, userId: session.userId },
      { $setOnInsert: { userId: session.userId, reportStatus: 'pending' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (err.code !== 11000) throw err;
    report = await InterviewReport.findOne({ sessionId: session._id, userId: session.userId });
  }
  if (!report) {
    throw new AppError('Unable to create the interview report record.', 409, 'REPORT_RECORD_CONFLICT');
  }

  if (report.reportStatus === 'completed') {
    session.reportStatus = 'completed';
    await session.save();
    return report;
  }

  const staleBefore = new Date(Date.now() - REPORT_STALE_AFTER_MS);
  if (['processing', 'generating'].includes(report.reportStatus)) {
    if (!report.updatedAt || report.updatedAt >= staleBefore) {
      session.reportStatus = 'processing';
      await session.save();
      return report;
    }
    await InterviewReport.findOneAndUpdate(
      { _id: report._id, reportStatus: report.reportStatus, updatedAt: { $lt: staleBefore } },
      { $set: { reportStatus: 'pending' } },
      { new: true }
    );
    report = await InterviewReport.findById(report._id);
  }

  if (report.reportStatus === 'failed' && !force) {
    session.reportStatus = 'failed';
    await session.save();
    return report;
  }

  const token = uuidv4();
  const allowedStatuses = force ? ['pending', 'failed'] : ['pending'];
  const claimedReport = await InterviewReport.findOneAndUpdate(
    { _id: report._id, userId: session.userId, reportStatus: { $in: allowedStatuses } },
    {
      $set: {
        reportStatus: 'processing',
        generationToken: token,
        errorMessage: '',
        generatedAt: null,
      },
    },
    { new: true }
  );
  if (!claimedReport) {
    const latest = await InterviewReport.findOne({ _id: report._id, userId: session.userId });
    if (!latest) throw new AppError('Report not found', 404, 'NOT_FOUND');
    session.reportStatus = latest.reportStatus === 'generating' ? 'processing' : latest.reportStatus;
    await session.save();
    return latest;
  }

  session.reportStatus = 'processing';
  await session.save();
  generateReportAsync(session, answers, claimedReport, token).catch(err => {
    console.error('[REPORT_GEN]', {
      sessionId: String(session._id),
      code: err.code || err.name || 'UNKNOWN',
    });
  });
  return claimedReport;
}

function validateReportData(data) {
  const listFields = [
    'strengths',
    'weaknesses',
    'improvements',
    'missingConcepts',
    'suggestedTopics',
    'recommendedPractice',
    'nextSteps',
  ];
  for (const field of listFields) {
    if (!Array.isArray(data[field]) || data[field].some(item => typeof item !== 'string')) {
      throw Object.assign(new Error(`Invalid report field: ${field}`), { code: 'AI_INVALID_RESPONSE' });
    }
  }
  for (const field of ['detailedFeedback', 'performanceSummary']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) {
      throw Object.assign(new Error(`Invalid report field: ${field}`), { code: 'AI_INVALID_RESPONSE' });
    }
  }
}

async function generateReportAsync(session, answers, report, token) {
  try {
    const questions = await InterviewQuestion.find({ sessionId: session._id }).sort('order');
    const questionsById = Object.fromEntries(questions.map(q => [String(q._id), q]));
    const sessionAnswers = Array.isArray(answers) ? answers : [];
    if (!sessionAnswers.length || sessionAnswers.some(answer => !answer.answerText?.trim())) {
      throw Object.assign(new Error('Interview answers are missing'), { code: 'MISSING_INTERVIEW_DATA' });
    }

    const answerSummaries = sessionAnswers.map(answer => {
      const question = questionsById[String(answer.questionId)];
      return {
        questionText: question?.questionText || '',
        category: question?.category || '',
        answerText: answer.answerText,
        evaluationStatus: answer.evaluationStatus,
        overallScore: answer.overallScore,
        detailedFeedback: answer.detailedFeedback,
        strengths: answer.strengths || [],
        weaknesses: answer.weaknesses || [],
      };
    });
    if (answerSummaries.some(answer => !answer.questionText)) {
      throw Object.assign(new Error('Interview questions are missing'), { code: 'MISSING_INTERVIEW_DATA' });
    }

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
    validateReportData(rData || {});

    const scoredAnswers = sessionAnswers.filter(a =>
      a.evaluationStatus === 'completed' && a.overallScore != null
    );
    const categoryByQuestionId = Object.fromEntries(questions.map(q => [String(q._id), q.category]));
    const technicalAnswers = scoredAnswers.filter(a =>
      ['technical', 'coding', 'system_design'].includes(categoryByQuestionId[String(a.questionId)])
    );
    const behavioralAnswers = scoredAnswers.filter(a =>
      ['behavioral', 'hr'].includes(categoryByQuestionId[String(a.questionId)])
    );
    const average = list => list.length
      ? Math.round(list.reduce((sum, a) => sum + a.overallScore, 0) / list.length)
      : null;
    const clarityScores = scoredAnswers.filter(a => a.evaluation?.clarity != null).map(a => a.evaluation.clarity);
    const depthScores = scoredAnswers.filter(a => a.evaluation?.depth != null).map(a => a.evaluation.depth);

    const savedReport = await InterviewReport.updateOne(
      { _id: report._id, reportStatus: 'processing', generationToken: token },
      {
        $set: {
          overallScore: session.overallScore,
          sectionScores: {
            technical: average(technicalAnswers),
            behavioral: average(behavioralAnswers),
            communication: clarityScores.length
              ? Math.round(clarityScores.reduce((sum, score) => sum + score, 0) / clarityScores.length)
              : null,
            problemSolving: depthScores.length
              ? Math.round(depthScores.reduce((sum, score) => sum + score, 0) / depthScores.length)
              : null,
          },
          strengths: rData.strengths,
          weaknesses: rData.weaknesses,
          improvements: rData.improvements,
          missingConcepts: rData.missingConcepts,
          suggestedTopics: rData.suggestedTopics,
          recommendedPractice: rData.recommendedPractice,
          detailedFeedback: rData.detailedFeedback,
          performanceSummary: rData.performanceSummary,
          nextSteps: rData.nextSteps,
          reportStatus: 'completed',
          errorMessage: '',
          generatedAt: new Date(),
          providerUsed: rResult.provider || '',
          modelUsed: rResult.model || '',
        },
      },
      { runValidators: true }
    );
    if (savedReport.matchedCount !== 1) return;

    session.reportStatus = 'completed';
    try {
      await session.save();
    } catch (err) {
      console.error('[REPORT_GEN_SESSION_STATUS]', {
        sessionId: String(session._id),
        code: err.code || err.name || 'UNKNOWN',
      });
    }
  } catch (err) {
    console.error('[REPORT_GEN_ERROR]', {
      sessionId: String(session._id),
      code: err.code || err.name || 'UNKNOWN',
    });
    try {
      const failed = await InterviewReport.updateOne(
        { _id: report._id, reportStatus: 'processing', generationToken: token },
        { $set: { reportStatus: 'failed', errorMessage: err.code || err.name || 'REPORT_GENERATION_FAILED' } }
      );
      if (failed.matchedCount === 1) {
        await InterviewSession.updateOne(
          { _id: session._id, userId: session.userId, reportStatus: 'processing' },
          { $set: { reportStatus: 'failed' } }
        );
      }
    } catch (saveErr) {
      console.error('[REPORT_GEN_FAILURE_SAVE]', {
        sessionId: String(session._id),
        code: saveErr.code || saveErr.name || 'UNKNOWN',
      });
    }
  }
}

async function recoverStaleReportGenerations() {
  const staleBefore = new Date(Date.now() - REPORT_STALE_AFTER_MS);
  const staleReports = await InterviewReport.find({
    reportStatus: { $in: ['processing', 'generating'] },
    updatedAt: { $lt: staleBefore },
  }).select('_id sessionId userId');

  for (const report of staleReports) {
    const session = await InterviewSession.findOne({ _id: report.sessionId, userId: report.userId });
    if (!session) {
      await InterviewReport.updateOne(
        { _id: report._id, reportStatus: { $in: ['processing', 'generating'] } },
        { $set: { reportStatus: 'failed', errorMessage: 'INTERVIEW_SESSION_NOT_FOUND' } }
      );
      continue;
    }
    const answers = await InterviewAnswer.find({ sessionId: session._id }).sort('submittedAt');
    await queueReportGeneration(session, answers, { force: true });
  }
}

module.exports = {
  createSession,
  getSessions,
  getSession,
  startSession,
  nextQuestion,
  submitAnswer,
  evaluateAnswer,
  completeSession,
  resumeSession,
  deleteSession,
  finishSession,
  getInterviewReport,
  queueReportGeneration,
  generateReportAsync,
  recoverStaleReportGenerations,
};
