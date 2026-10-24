jest.mock('../models/InterviewSession', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock('../models/InterviewAnswer', () => ({ find: jest.fn() }));
jest.mock('../models/InterviewQuestion', () => ({ find: jest.fn() }));
jest.mock('../models/InterviewReport', () => ({
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'generation-token') }));
jest.mock('../services/ai/aiProviderManager', () => ({
  generateInterviewReport: jest.fn(),
}));

const InterviewSession = require('../models/InterviewSession');
const InterviewAnswer = require('../models/InterviewAnswer');
const InterviewQuestion = require('../models/InterviewQuestion');
const InterviewReport = require('../models/InterviewReport');
const ai = require('../services/ai/aiProviderManager');
const { completeSession } = require('./interviewController');

const answer = {
  _id: 'answer-1',
  questionId: 'question-1',
  answerText: 'I would first inspect the requirements and then choose a suitable data structure.',
  evaluationStatus: 'completed',
  overallScore: 82,
  evaluation: { clarity: 80, depth: 85 },
  detailedFeedback: 'Clear and relevant explanation.',
  strengths: ['Structured'],
  weaknesses: [],
};

const generatedData = (summary = 'Completed report') => ({
  strengths: ['Structured answer'],
  weaknesses: ['Could add an example'],
  improvements: ['Explain trade-offs'],
  missingConcepts: [],
  suggestedTopics: ['Data structures'],
  recommendedPractice: ['Practice complexity analysis'],
  detailedFeedback: 'The response was clear and relevant.',
  performanceSummary: summary,
  nextSteps: ['Practice another problem'],
});

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function makeDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitFor(predicate) {
  for (let i = 0; i < 40; i += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  throw new Error('Timed out waiting for asynchronous report generation');
}

function setupSession() {
  const session = {
    _id: 'session-1',
    userId: 'user-1',
    status: 'in_progress',
    configuration: {
      targetRole: 'Engineer',
      experienceLevel: 'junior',
      interviewType: 'technical',
      timeLimitMinutes: 30,
    },
    save: jest.fn().mockImplementation(async function save() { return this; }),
  };
  const report = {
    _id: 'report-1',
    sessionId: 'session-1',
    userId: 'user-1',
    reportStatus: 'pending',
    updatedAt: new Date(),
  };

  InterviewSession.findOne.mockResolvedValue(session);
  InterviewSession.updateOne.mockImplementation(async (filter, update) => {
    if (update.$set?.reportStatus) session.reportStatus = update.$set.reportStatus;
    return { matchedCount: 1 };
  });
  InterviewAnswer.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([answer]) });
  InterviewReport.findOneAndUpdate.mockImplementation(async (filter, update) => {
    if (filter.sessionId) return report;
    if (filter._id) {
      report.reportStatus = update.$set.reportStatus;
      report.generationToken = update.$set.generationToken;
      report.updatedAt = new Date();
      return report;
    }
    return null;
  });
  InterviewReport.updateOne.mockImplementation(async (filter, update) => {
    if (
      filter._id === report._id &&
      filter.reportStatus === report.reportStatus &&
      filter.generationToken === report.generationToken
    ) {
      Object.assign(report, update.$set);
      return { matchedCount: 1 };
    }
    return { matchedCount: 0 };
  });
  InterviewQuestion.find.mockReturnValue({
    sort: jest.fn().mockResolvedValue([{
      _id: 'question-1',
      category: 'technical',
      questionText: 'How would you choose a data structure?',
    }]),
  });
  return { session, report };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('completeSession report workflow', () => {
  test('saves final interview data and returns the actual report ID while generation runs once', async () => {
    const { session, report } = setupSession();
    const generation = makeDeferred();
    ai.generateInterviewReport.mockReturnValue(generation.promise);
    const res = makeResponse();
    const req = { params: { id: 'session-1' }, user: { _id: 'user-1' }, body: {} };

    await completeSession(req, res, jest.fn());
    await waitFor(() => ai.generateInterviewReport.mock.calls.length === 1);

    expect(session.status).toBe('completed');
    expect(session.reportStatus).toBe('processing');
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'session-1',
      reportId: 'report-1',
      reportStatus: 'processing',
    }));
    expect(InterviewReport.findOneAndUpdate).toHaveBeenCalledWith(
      { sessionId: 'session-1', userId: 'user-1' },
      { $setOnInsert: { userId: 'user-1', reportStatus: 'pending' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    expect(ai.generateInterviewReport.mock.calls[0][0].answers[0]).toEqual(expect.objectContaining({
      questionText: 'How would you choose a data structure?',
      answerText: answer.answerText,
      overallScore: 82,
    }));

    await completeSession(req, makeResponse(), jest.fn());
    expect(ai.generateInterviewReport).toHaveBeenCalledTimes(1);

    generation.resolve({ provider: 'test', model: 'test-model', data: generatedData() });
    await waitFor(() => report.reportStatus === 'completed');
    expect(report.overallScore).toBe(82);
    expect(session.reportStatus).toBe('completed');
  });

  test('does not complete an interview without submitted answers', async () => {
    const { session } = setupSession();
    InterviewAnswer.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const next = jest.fn();

    await completeSession(
      { params: { id: 'session-1' }, user: { _id: 'user-1' }, body: {} },
      makeResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 409,
      code: 'MISSING_INTERVIEW_DATA',
    }));
    expect(session.status).toBe('in_progress');
    expect(InterviewReport.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('marks provider failures failed and allows an explicit retry on the same report', async () => {
    const { session, report } = setupSession();
    ai.generateInterviewReport
      .mockRejectedValueOnce(Object.assign(new Error('provider detail'), { code: 'AI_PROVIDERS_UNAVAILABLE' }))
      .mockResolvedValueOnce({ provider: 'test', model: 'test-model', data: generatedData('Recovered report') });
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const req = { params: { id: 'session-1' }, user: { _id: 'user-1' }, body: {} };

    await completeSession(req, makeResponse(), jest.fn());
    await waitFor(() => report.reportStatus === 'failed');
    expect(report.errorMessage).toBe('AI_PROVIDERS_UNAVAILABLE');
    expect(session.reportStatus).toBe('failed');

    req.body.retry = true;
    await completeSession(req, makeResponse(), jest.fn());
    await waitFor(() => report.reportStatus === 'completed');
    expect(ai.generateInterviewReport).toHaveBeenCalledTimes(2);
    expect(report._id).toBe('report-1');
    expect(session.status).toBe('completed');
    logError.mockRestore();
  });

  test('does not overwrite a completed report when a late worker fails', async () => {
    const { report } = setupSession();
    report.reportStatus = 'completed';
    report.generationToken = 'newer-token';
    ai.generateInterviewReport.mockRejectedValue(new Error('late provider failure'));

    const { generateReportAsync } = require('./interviewController');
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
    await generateReportAsync(
      { _id: 'session-1', userId: 'user-1', configuration: {} },
      [answer],
      { _id: 'report-1' },
      'older-token'
    );

    expect(report.reportStatus).toBe('completed');
    expect(InterviewReport.updateOne).toHaveBeenCalledWith(
      { _id: 'report-1', reportStatus: 'processing', generationToken: 'older-token' },
      expect.objectContaining({ $set: expect.objectContaining({ reportStatus: 'failed' }) })
    );
    logError.mockRestore();
  });
});
