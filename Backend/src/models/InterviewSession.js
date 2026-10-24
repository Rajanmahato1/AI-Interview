const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  configuration: {
    targetRole: { type: String, required: true },
    experienceLevel: { type: String, enum: ['fresher', 'junior', 'mid', 'senior'], required: true },
    interviewType: { type: String, enum: ['technical', 'behavioral', 'hr', 'mixed'], required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    companyType: { type: String, enum: ['startup', 'product', 'service', 'enterprise'], default: 'product' },
    technologies: [{ type: String }],
    questionCount: { type: Number, default: 10, min: 1, max: 30 },
    timeLimitMinutes: { type: Number, default: 30, min: 5, max: 120 },
    jobDescription: { type: String, default: '' },
    resumeText: { type: String, default: '' },
    adaptiveEnabled: { type: Boolean, default: false },
  },
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'evaluating', 'completed', 'failed', 'interrupted'],
    default: 'draft',
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  expiresAt: { type: Date },
  currentQuestionIndex: { type: Number, default: 0 },
  questionCount: { type: Number, default: 0 },
  overallScore: { type: Number, default: null },
  totalScore: { type: Number, default: null },
  reportStatus: { type: String, enum: ['pending', 'processing', 'generating', 'completed', 'failed'], default: 'pending' },
  qa: [{
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
    feedback: { type: String, default: '' },
    score: { type: Number, default: null },
    timeTaken: { type: Number, default: 0 },
    fillerCount: { type: Number, default: 0 },
  }],
  report: {
    overallScore: { type: Number, default: null },
    summary: { type: String, default: '' },
    strengths: [{ type: String }],
    weakAreas: [{ type: String }],
    tips: [{ type: String }],
    perQuestion: [{
      question: { type: String, default: '' },
      score: { type: Number, default: null },
      comment: { type: String, default: '' },
      timeTaken: { type: Number, default: 0 },
      fillerCount: { type: Number, default: 0 },
    }],
    generatedAt: { type: Date, default: null },
  },
}, { timestamps: true });

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, status: 1 });
module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
