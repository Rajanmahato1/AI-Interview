// ── AI Provider Manager ─────────────────────────────────────────────
// Manages fallback across Gemini → Groq → DeepSeek
const config = require('../../config');
const gemini = require('./providers/geminiProvider');
const groq = require('./providers/groqProvider');
const deepseek = require('./providers/deepseekProvider');

const PROVIDERS = { gemini, groq, deepseek };

function getProviderOrder() {
  const primary = config.AI_PRIMARY_PROVIDER || 'gemini';
  const fallbacks = config.AI_FALLBACK_PROVIDERS || ['groq', 'deepseek'];
  return [primary, ...fallbacks.filter(p => p !== primary)];
}

function isRetryable(err) {
  if (!err) return false;
  const status = err.response?.status || err.statusCode;
  const retryStatuses = [429, 500, 502, 503, 504];
  if (status && retryStatuses.includes(status)) return true;
  // Network errors
  const networkCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'ENETUNREACH'];
  if (err.code && networkCodes.includes(err.code)) return true;
  if (err.message && /timeout|network|unavailable|overloaded/i.test(err.message)) return true;
  return false;
}

async function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' })), ms)),
  ]);
}

async function callWithFallback(operation, ...args) {
  const order = getProviderOrder();
  const maxRetries = config.AI_MAX_RETRIES || 1;
  const timeout = config.AI_REQUEST_TIMEOUT_MS || 30000;
  const errors = [];

  for (const providerName of order) {
    const provider = PROVIDERS[providerName];
    if (!provider) { errors.push({ provider: providerName, error: 'Provider not found' }); continue; }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await withTimeout(provider[operation](...args), timeout);
        return { ...result, provider: providerName };
      } catch (err) {
        const retryable = isRetryable(err);
        errors.push({ provider: providerName, attempt, error: err.message, retryable });
        if (!retryable) break; // non-retryable: skip further retries, try next provider
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 8000);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
  }

  const error = new Error('All AI providers failed');
  error.code = 'AI_PROVIDERS_UNAVAILABLE';
  error.statusCode = 503;
  error.details = errors;
  throw error;
}

// ── Public interface ─────────────────────────────────────────────────
async function generateText(prompt, options) {
  return callWithFallback('generateText', prompt, options);
}

async function generateInterviewQuestion(params) {
  const { role, experienceLevel, interviewType, difficulty, companyType, technologies, jobDescription, resumeText, previousQuestions, questionNumber, totalQuestions } = params;

  const techList = technologies?.length ? technologies.join(', ') : 'general';
  const prevQs = previousQuestions?.length ? `\nPreviously asked (do NOT repeat):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : '';
  const jdSection = jobDescription ? `\nJob Description:\n${jobDescription.substring(0, 800)}` : '';
  const resumeSection = resumeText ? `\nCandidate Skills (from resume):\n${resumeText.substring(0, 500)}` : '';

  const prompt = `You are an expert technical interviewer. Generate a single interview question.

Role: ${role}
Experience Level: ${experienceLevel}
Interview Type: ${interviewType}
Difficulty: ${difficulty}
Company Type: ${companyType}
Technologies/Skills: ${techList}
Question ${questionNumber} of ${totalQuestions}
${jdSection}${resumeSection}${prevQs}

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
{
  "questionText": "The full question text",
  "category": "technical|behavioral|hr|coding|system_design|scenario",
  "expectedConcepts": ["concept1", "concept2"],
  "technology": "main technology or empty string"
}`;

  const result = await callWithFallback('generateText', prompt, { temperature: 0.8 });
  const parsed = safeParseJSON(result.content);
  if (!parsed || !parsed.questionText) throw Object.assign(new Error('Invalid question format from AI'), { code: 'AI_INVALID_RESPONSE' });
  return { ...result, data: parsed };
}

async function evaluateInterviewAnswer(params) {
  const { questionText, answerText, expectedConcepts, role, experienceLevel, difficulty, interviewType, technologies } = params;

  if (!answerText || answerText.trim().length < 3) {
    return {
      provider: 'system', model: 'local', content: '', latencyMs: 0, status: 'success',
      data: {
        evaluationStatus: 'completed',
        evaluation: { correctness: 0, clarity: 0, depth: 0, structure: 0, relevance: 0 },
        strengths: [],
        weaknesses: ['No answer provided'],
        improvements: ['Please provide a substantive answer'],
        idealAnswer: '',
        detailedFeedback: 'No answer was provided.',
      },
    };
  }

  const concepts = expectedConcepts?.length ? expectedConcepts.join(', ') : 'general concepts';

  const prompt = `You are an expert technical interviewer evaluating a candidate's answer.

Role: ${role} | Level: ${experienceLevel} | Type: ${interviewType} | Difficulty: ${difficulty}
Technologies: ${technologies?.join(', ') || 'general'}

Question: ${questionText}
Expected Concepts: ${concepts}
Candidate Answer: ${answerText}

Evaluate and respond ONLY with this JSON (no markdown):
{
  "evaluationStatus": "completed",
  "evaluation": {
    "correctness": <0-100>,
    "clarity": <0-100>,
    "depth": <0-100>,
    "structure": <0-100>,
    "relevance": <0-100>
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvements": ["..."],
  "idealAnswer": "concise reference answer",
  "detailedFeedback": "constructive paragraph"
}`;

  const result = await callWithFallback('generateText', prompt, { temperature: 0.3 });
  const parsed = safeParseJSON(result.content);
  if (!parsed || !parsed.evaluation) throw Object.assign(new Error('Invalid evaluation format from AI'), { code: 'AI_INVALID_RESPONSE' });
  validateEvaluationScores(parsed.evaluation);
  return { ...result, data: parsed };
}

async function generateInterviewReport(params) {
  const { role, experienceLevel, interviewType, answers, sessionDuration } = params;

  const answerSummary = answers.map((a, i) =>
    `Q${i + 1}: ${a.questionText}\nScore: ${a.overallScore ?? 'N/A'}\nFeedback: ${a.detailedFeedback || 'N/A'}`
  ).join('\n\n');

  const prompt = `You are an expert career coach generating an interview performance report.

Role: ${role} | Level: ${experienceLevel} | Type: ${interviewType}
Duration: ${sessionDuration} minutes
Total Questions: ${answers.length}

Answer Summaries:
${answerSummary.substring(0, 3000)}

Respond ONLY with valid JSON:
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvements": ["..."],
  "missingConcepts": ["..."],
  "suggestedTopics": ["..."],
  "recommendedPractice": ["..."],
  "detailedFeedback": "2-3 paragraph feedback",
  "performanceSummary": "1 paragraph summary",
  "nextSteps": ["..."]
}`;

  const result = await callWithFallback('generateText', prompt, { temperature: 0.4 });
  const parsed = safeParseJSON(result.content);
  if (!parsed) throw Object.assign(new Error('Invalid report format from AI'), { code: 'AI_INVALID_RESPONSE' });
  return { ...result, data: parsed };
}

async function generateFollowUpQuestion(params) {
  const { questionText, answerText, weaknesses, role, difficulty, technologies } = params;

  const prompt = `Generate a follow-up interview question based on the candidate's weaknesses.

Original Question: ${questionText}
Candidate's Answer: ${answerText}
Identified Weaknesses: ${weaknesses?.join(', ') || 'general gaps'}
Role: ${role} | Difficulty: ${difficulty} | Technologies: ${technologies?.join(', ') || 'general'}

Respond ONLY with JSON:
{
  "questionText": "The follow-up question",
  "category": "technical|behavioral|hr|coding|system_design|scenario",
  "expectedConcepts": ["concept1"],
  "technology": "main technology or empty"
}`;

  const result = await callWithFallback('generateText', prompt, { temperature: 0.7 });
  const parsed = safeParseJSON(result.content);
  if (!parsed || !parsed.questionText) throw Object.assign(new Error('Invalid follow-up format from AI'), { code: 'AI_INVALID_RESPONSE' });
  return { ...result, data: parsed };
}

// ── Helpers ──────────────────────────────────────────────────────────
function safeParseJSON(text) {
  if (!text) return null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : JSON.parse(text);
  } catch { return null; }
}

function validateEvaluationScores(evaluation) {
  const fields = ['correctness', 'clarity', 'depth', 'structure', 'relevance'];
  fields.forEach(f => {
    const v = evaluation[f];
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 100) {
      evaluation[f] = 0;
    } else {
      evaluation[f] = Math.round(v);
    }
  });
}

module.exports = { generateText, generateInterviewQuestion, evaluateInterviewAnswer, generateInterviewReport, generateFollowUpQuestion };
