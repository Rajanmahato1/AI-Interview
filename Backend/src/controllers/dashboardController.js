const InterviewSession = require('../models/InterviewSession');
const InterviewAnswer = require('../models/InterviewAnswer');
const InterviewReport = require('../models/InterviewReport');
const { AppError } = require('../middleware/errorHandler');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [sessions, answers, reports] = await Promise.all([
      InterviewSession.find({ userId }).select('status overallScore configuration startedAt completedAt createdAt').sort({ createdAt: -1 }),
      InterviewAnswer.find({ sessionId: { $in: await InterviewSession.find({ userId }).distinct('_id') } }).select('overallScore evaluationStatus'),
      InterviewReport.find({ userId }).select('overallScore sectionScores generatedAt sessionId').sort({ generatedAt: -1 }),
    ]);

    const completed = sessions.filter(s => s.status === 'completed');
    const totalInterviews = sessions.length;
    const completedInterviews = completed.length;
    const totalQuestions = answers.filter(a => a.evaluationStatus === 'completed').length;

    const scores = completed.filter(s => s.overallScore !== null).map(s => s.overallScore);
    const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const highestScore = scores.length ? Math.max(...scores) : null;

    // Score trend (last 10 completed)
    const scoreTrend = completed.slice(0, 10).reverse().map(s => ({
      date: s.completedAt || s.createdAt,
      score: s.overallScore,
      role: s.configuration?.targetRole,
    }));

    // Skill breakdown from recent answers (up to 50)
    const recentSessions = sessions.slice(0, 5).map(s => ({
      _id: s._id,
      role: s.configuration?.targetRole,
      type: s.configuration?.interviewType,
      status: s.status,
      score: s.overallScore,
      date: s.completedAt || s.createdAt,
    }));

    res.json({
      success: true,
      stats: {
        totalInterviews,
        completedInterviews,
        totalQuestions,
        averageScore,
        highestScore,
        scoreTrend,
        recentSessions,
        reports: reports.slice(0, 5),
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getDashboardStats };
