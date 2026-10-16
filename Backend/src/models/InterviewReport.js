const mongoose = require('mongoose');

const interviewReportSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  overallScore: { type: Number, default: null },
  sectionScores: {
    technical: { type: Number, default: null },
    behavioral: { type: Number, default: null },
    communication: { type: Number, default: null },
    problemSolving: { type: Number, default: null },
  },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  improvements: [{ type: String }],
  missingConcepts: [{ type: String }],
  suggestedTopics: [{ type: String }],
  recommendedPractice: [{ type: String }],
  detailedFeedback: { type: String, default: '' },
  performanceSummary: { type: String, default: '' },
  nextSteps: [{ type: String }],
  reportStatus: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating' },
  generatedAt: { type: Date, default: null },
  providerUsed: { type: String, default: '' },
  modelUsed: { type: String, default: '' },
}, { timestamps: true });

interviewReportSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model('InterviewReport', interviewReportSchema);
