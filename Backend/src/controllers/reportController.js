const mongoose = require('mongoose');
const InterviewReport = require('../models/InterviewReport');
const InterviewSession = require('../models/InterviewSession');
const InterviewAnswer = require('../models/InterviewAnswer');
const InterviewQuestion = require('../models/InterviewQuestion');
const { AppError } = require('../middleware/errorHandler');

async function findReportForUser(id, userId, sessionFields) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid report or interview ID', 400, 'INVALID_ID');
  }

  const populateFields = `${sessionFields} userId`;
  const report = await InterviewReport.findOne({ _id: id, userId })
    .populate('sessionId', populateFields);

  if (report) {
    const session = report.sessionId;
    if (!session || String(session.userId) !== String(userId)) return null;
    return { report, session };
  }

  const session = await InterviewSession.findOne({ _id: id, userId });
  if (!session) return null;

  const sessionReport = await InterviewReport.findOne({ sessionId: session._id, userId })
    .populate('sessionId', populateFields);
  return { report: sessionReport, session };
}

function respondForReportStatus(res, report, session) {
  const status = report?.reportStatus || session?.reportStatus;

  if (status === 'failed') {
    throw new AppError(
      'Report generation failed. Please retry.',
      503,
      'REPORT_GENERATION_FAILED'
    );
  }

  if (report && status === 'completed') {
    return null;
  }

  // Report missing but session is still processing.
  if (
    !report &&
    (!status || status === 'pending' || status === 'processing' || status === 'generating')
  ) {
    return res.status(202).json({
      success: true,
      reportId: report?._id,
      reportStatus: status === 'generating' ? 'processing' : (status || 'pending'),
      message: 'Report is still being generated.',
    });
  }

  // A completed session without a report must not poll forever.
  if (!report && status === 'completed') {
    throw new AppError(
      'Interview completed, but the report record is missing. Retry generation.',
      503,
      'REPORT_GENERATION_FAILED'
    );
  }

  if (status === 'pending' || status === 'processing' || status === 'generating') {
    return res.status(202).json({
      success: true,
      reportId: report?._id,
      reportStatus: status === 'generating' ? 'processing' : status,
      message: 'Report is still being generated.',
    });
  }

  if (!report) {
    throw new AppError(
      'Report is not available. Please retry generation.',
      503,
      'REPORT_GENERATION_FAILED'
    );
  }

  return null;
}

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
    const result = await findReportForUser(req.params.id, req.user._id, 'configuration status completedAt startedAt');
    if (!result) throw new AppError('Report not found', 404, 'NOT_FOUND');
    // const report = result.report || (result.session ? null : result);
    // const session = result.session || (report && report.sessionId);
    let { report } = result;
    const { session } = result;
    if (!report && session.status === 'completed') {
      const answers = await InterviewAnswer.find({ sessionId: session._id }).sort('submittedAt');
      const { queueReportGeneration } = require('./interviewController');
      report = await queueReportGeneration(session, answers);
    }
    const statusResponse = respondForReportStatus(res, report, session);
    if (statusResponse) return statusResponse;

    const sessionId = (session && session._id) || (report.sessionId && (report.sessionId._id || report.sessionId)) || report.sessionId;
    const answers = await InterviewAnswer.find({ sessionId }).sort('submittedAt');
    const questions = await InterviewQuestion.find({ sessionId }).sort('order');

    const qMap = Object.fromEntries(questions.map(q => [String(q._id), q]));
    const answersWithQuestions = answers.map(a => {
      const obj = typeof a.toObject === 'function' ? a.toObject() : a;
      return {
        ...obj,
        question: qMap[String(a.questionId)] || null,
      };
    });

    res.json({ success: true, report, answers: answersWithQuestions });
  } catch (err) { next(err); }
};

// POST /api/reports/:id/retry
const retryReport = async (req, res, next) => {
  try {
    const result = await findReportForUser(req.params.id, req.user._id, 'configuration status completedAt startedAt');
    if (!result || !result.session) throw new AppError('Report not found', 404, 'NOT_FOUND');
    const { session } = result;

    const answers = await InterviewAnswer.find({ sessionId: session._id }).sort('submittedAt');
    const { queueReportGeneration } = require('./interviewController');
    const report = await queueReportGeneration(session, answers, { force: true });

    res.status(report.reportStatus === 'completed' ? 200 : 202).json({
      success: true,
      reportId: String(report._id),
      reportStatus: report.reportStatus === 'completed' ? 'completed' : 'processing',
      message: 'Diagnostic report generation restarted.',
    });
  } catch (err) { next(err); }
};

// GET /api/reports/:id/pdf  (simple HTML-rendered PDF placeholder)
const getReportPdf = async (req, res, next) => {
  try {
    const result = await findReportForUser(req.params.id, req.user._id, 'configuration completedAt');
    if (!result) throw new AppError('Report not found', 404, 'NOT_FOUND');
    const report = result.report || (result.session ? null : result);
    const session = result.session || (report && report.sessionId);
    const statusResponse = respondForReportStatus(res, report, session);
    if (statusResponse) return statusResponse;

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

module.exports = { getReports, getReport, getReportPdf, retryReport };
