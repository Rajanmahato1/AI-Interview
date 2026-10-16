const InterviewReport = require('../models/InterviewReport');
const InterviewSession = require('../models/InterviewSession');
const InterviewAnswer = require('../models/InterviewAnswer');
const InterviewQuestion = require('../models/InterviewQuestion');
const { AppError } = require('../middleware/errorHandler');

// GET /api/reports
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      InterviewReport.find({ userId: req.user._id }).sort('-generatedAt').skip(skip).limit(parseInt(limit)).populate('sessionId', 'configuration status completedAt'),
      InterviewReport.countDocuments({ userId: req.user._id }),
    ]);
    res.json({ success: true, reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
};

// GET /api/reports/:id
const getReport = async (req, res, next) => {
  try {
    const report = await InterviewReport.findOne({ _id: req.params.id, userId: req.user._id }).populate('sessionId', 'configuration status completedAt startedAt');
    if (!report) throw new AppError('Report not found', 404, 'NOT_FOUND');

    const answers = await InterviewAnswer.find({ sessionId: report.sessionId }).sort('submittedAt');
    const questions = await InterviewQuestion.find({ sessionId: report.sessionId }).sort('order');

    const qMap = Object.fromEntries(questions.map(q => [String(q._id), q]));
    const answersWithQuestions = answers.map(a => ({
      ...a.toObject(),
      question: qMap[String(a.questionId)] || null,
    }));

    res.json({ success: true, report, answers: answersWithQuestions });
  } catch (err) { next(err); }
};

// GET /api/reports/:id/pdf  (simple HTML-rendered PDF placeholder)
const getReportPdf = async (req, res, next) => {
  try {
    const report = await InterviewReport.findOne({ _id: req.params.id, userId: req.user._id }).populate('sessionId', 'configuration completedAt');
    if (!report) throw new AppError('Report not found', 404, 'NOT_FOUND');

    const session = report.sessionId;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Interview Report</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a2e}h1{color:#6c63ff}h2{color:#4a47a3}
    .score{font-size:48px;font-weight:bold;color:#6c63ff}.section{margin:20px 0;border-left:4px solid #6c63ff;padding-left:16px}
    ul{padding-left:20px}li{margin:4px 0}</style></head><body>
    <h1>Interview Report — ${session?.configuration?.targetRole || 'Unknown Role'}</h1>
    <p>Date: ${report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : 'N/A'} | Type: ${session?.configuration?.interviewType || ''}</p>
    <div class="score">${report.overallScore ?? 'N/A'}<span style="font-size:20px">/100</span></div>
    <div class="section"><h2>Performance Summary</h2><p>${report.performanceSummary || 'N/A'}</p></div>
    <div class="section"><h2>Strengths</h2><ul>${(report.strengths || []).map(s => `<li>${s}</li>`).join('')}</ul></div>
    <div class="section"><h2>Areas to Improve</h2><ul>${(report.improvements || []).map(i => `<li>${i}</li>`).join('')}</ul></div>
    <div class="section"><h2>Suggested Topics</h2><ul>${(report.suggestedTopics || []).map(t => `<li>${t}</li>`).join('')}</ul></div>
    <div class="section"><h2>Next Steps</h2><ul>${(report.nextSteps || []).map(n => `<li>${n}</li>`).join('')}</ul></div>
    </body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="report-${report._id}.html"`);
    res.send(html);
  } catch (err) { next(err); }
};

module.exports = { getReports, getReport, getReportPdf };
