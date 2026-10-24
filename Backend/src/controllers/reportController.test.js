jest.mock('../models/InterviewReport', () => ({ findOne: jest.fn() }));
jest.mock('../models/InterviewSession', () => ({ findOne: jest.fn() }));
jest.mock('../models/InterviewAnswer', () => ({ find: jest.fn() }));
jest.mock('../models/InterviewQuestion', () => ({ find: jest.fn() }));
jest.mock('./interviewController', () => ({ queueReportGeneration: jest.fn().mockResolvedValue() }));

const InterviewReport = require('../models/InterviewReport');
const InterviewSession = require('../models/InterviewSession');
const InterviewAnswer = require('../models/InterviewAnswer');
const InterviewQuestion = require('../models/InterviewQuestion');
const { queueReportGeneration } = require('./interviewController');
const { getReport, retryReport } = require('./reportController');

const reportId = '6ada4f75db8f9a01c732d516';
const sessionId = '6ad2150bb677640288f6a058';
const userId = '6ada4f75db8f9a01c732d517';

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function populated(value) {
  return { populate: jest.fn().mockResolvedValue(value) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getReport', () => {
  test('continues to resolve existing reports by report ID', async () => {
    const report = {
      _id: reportId,
      sessionId: { _id: sessionId, userId, configuration: {}, status: 'completed' },
      reportStatus: 'completed',
    };
    InterviewReport.findOne.mockReturnValue(populated(report));
    InterviewAnswer.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    InterviewQuestion.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const res = makeResponse();

    await getReport({ params: { id: reportId }, user: { _id: userId } }, res, jest.fn());

    expect(InterviewReport.findOne).toHaveBeenCalledWith({ _id: reportId, userId });
    expect(res.json).toHaveBeenCalledWith({ success: true, report, answers: [] });
  });

  test('resolves a report using the interview session ID', async () => {
    const session = { _id: sessionId, userId, reportStatus: 'completed' };
    const report = {
      _id: reportId,
      sessionId: { _id: sessionId, userId, configuration: {}, status: 'completed' },
      reportStatus: 'completed',
    };
    InterviewReport.findOne
      .mockReturnValueOnce(populated(null))
      .mockReturnValueOnce(populated(report));
    InterviewSession.findOne.mockResolvedValue(session);
    InterviewAnswer.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    InterviewQuestion.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const res = makeResponse();

    await getReport({ params: { id: sessionId }, user: { _id: userId } }, res, jest.fn());

    expect(InterviewReport.findOne).toHaveBeenLastCalledWith({ sessionId, userId });
    expect(res.json).toHaveBeenCalledWith({ success: true, report, answers: [] });
  });

  test('returns processing status while report generation is delayed', async () => {
    InterviewReport.findOne.mockReturnValue(populated(null));
    InterviewSession.findOne.mockResolvedValue({
      _id: sessionId,
      userId,
      reportStatus: 'generating',
    });
    InterviewReport.findOne.mockReturnValueOnce(populated(null)).mockReturnValueOnce(populated(null));
    const res = makeResponse();

    await getReport({ params: { id: sessionId }, user: { _id: userId } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      reportStatus: 'processing',
    }));
  });

  test('returns a useful failure when report generation failed', async () => {
    const report = {
      _id: reportId,
      reportStatus: 'failed',
      sessionId: { _id: sessionId, userId },
    };
    InterviewReport.findOne.mockReturnValue(populated(report));
    const next = jest.fn();

    await getReport({ params: { id: reportId }, user: { _id: userId } }, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 503,
      code: 'REPORT_GENERATION_FAILED',
    }));
  });

  test('returns not found for an unknown or unauthorized session', async () => {
    InterviewReport.findOne.mockReturnValue(populated(null));
    InterviewSession.findOne.mockResolvedValue(null);
    const next = jest.fn();

    await getReport({ params: { id: reportId }, user: { _id: userId } }, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' }));
  });

  test('does not return a report whose referenced session belongs to another user', async () => {
    const report = {
      _id: reportId,
      reportStatus: 'completed',
      sessionId: { _id: sessionId, userId: '6ada4f75db8f9a01c732d518' },
    };
    InterviewReport.findOne.mockReturnValue(populated(report));
    const next = jest.fn();

    await getReport({ params: { id: reportId }, user: { _id: userId } }, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' }));
    expect(InterviewAnswer.find).not.toHaveBeenCalled();
  });

  test('forwards database failures to the API error handler', async () => {
    const error = new Error('database unavailable');
    InterviewReport.findOne.mockReturnValue({ populate: jest.fn().mockRejectedValue(error) });
    const next = jest.fn();

    await getReport({ params: { id: reportId }, user: { _id: userId } }, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('restarts report generation via retryReport and returns 202', async () => {
    const session = { _id: sessionId, userId, reportStatus: 'failed' };
    InterviewReport.findOne.mockReturnValue(populated(null));
    InterviewSession.findOne.mockResolvedValue(session);
    InterviewAnswer.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    queueReportGeneration.mockResolvedValue({ _id: reportId, reportStatus: 'processing' });
    const res = makeResponse();

    await retryReport({ params: { id: sessionId }, user: { _id: userId } }, res, jest.fn());

    expect(queueReportGeneration).toHaveBeenCalledWith(session, [], { force: true });
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      reportId,
      reportStatus: 'processing',
    }));
  });

  test('returns a controlled bad request for malformed IDs', async () => {
    const next = jest.fn();

    await getReport({ params: { id: 'malformed-id' }, user: { _id: userId } }, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: 'INVALID_ID' }));
  });
});
