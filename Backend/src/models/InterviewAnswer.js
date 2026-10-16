const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  correctness: { type: Number, min: 0, max: 100 },
  clarity: { type: Number, min: 0, max: 100 },
  depth: { type: Number, min: 0, max: 100 },
  structure: { type: Number, min: 0, max: 100 },
  relevance: { type: Number, min: 0, max: 100 },
}, { _id: false });

const interviewAnswerSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion', required: true, index: true },
  answerText: { type: String, required: true },
  evaluationStatus: {
    type: String,
    enum: ['pending', 'evaluating', 'completed', 'failed', 'skipped'],
    default: 'pending',
  },
  evaluation: { type: evaluationSchema, default: null },
  overallScore: { type: Number, default: null },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  improvements: [{ type: String }],
  idealAnswer: { type: String, default: '' },
  detailedFeedback: { type: String, default: '' },
  providerUsed: { type: String, default: '' },
  modelUsed: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  evaluatedAt: { type: Date, default: null },
  idempotencyKey: { type: String, unique: true, sparse: true },
}, { timestamps: true });

interviewAnswerSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });
module.exports = mongoose.model('InterviewAnswer', interviewAnswerSchema);
