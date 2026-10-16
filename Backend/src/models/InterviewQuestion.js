const mongoose = require('mongoose');

const interviewQuestionSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
  questionText: { type: String, required: true },
  category: { type: String, enum: ['technical', 'behavioral', 'hr', 'coding', 'system_design', 'scenario'], default: 'technical' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  technology: { type: String, default: '' },
  order: { type: Number, required: true },
  expectedConcepts: [{ type: String }],
  isFollowUp: { type: Boolean, default: false },
  parentQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion', default: null },
  providerUsed: { type: String, default: '' },
  modelUsed: { type: String, default: '' },
}, { timestamps: true });

interviewQuestionSchema.index({ sessionId: 1, order: 1 });
module.exports = mongoose.model('InterviewQuestion', interviewQuestionSchema);
