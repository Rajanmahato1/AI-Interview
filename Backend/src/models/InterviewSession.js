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
  reportStatus: { type: String, enum: ['pending', 'generating', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, status: 1 });
module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
