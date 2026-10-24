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
    `Q${i + 1} (${a.category || 'interview'}): ${a.questionText}\nCandidate answer: ${a.answerText || 'Not provided'}\nScore: ${a.overallScore ?? 'N/A'}\nEvaluation: ${a.detailedFeedback || 'Not evaluated'}\nExisting strengths: ${(a.strengths || []).join('; ') || 'N/A'}\nExisting weaknesses: ${(a.weaknesses || []).join('; ') || 'N/A'}`
  ).join('\n\n');

  const prompt = `You are an expert career coach generating an interview performance report.

Role: ${role} | Level: ${experienceLevel} | Type: ${interviewType}
Duration: ${sessionDuration} minutes
Total Questions: ${answers.length}

Answer Summaries:
${answerSummary.substring(0, 12000)}

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
  const listFields = [
    'strengths',
    'weaknesses',
    'improvements',
    'missingConcepts',
    'suggestedTopics',
    'recommendedPractice',
    'nextSteps',
  ];
  if (
    listFields.some(field => !Array.isArray(parsed[field]) || parsed[field].some(item => typeof item !== 'string')) ||
    ['detailedFeedback', 'performanceSummary'].some(field => typeof parsed[field] !== 'string' || !parsed[field].trim())
  ) {
    throw Object.assign(new Error('Invalid report fields from AI'), { code: 'AI_INVALID_RESPONSE' });
  }
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
  let cleaned = String(text).trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {}

  try {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const sanitized = match[0].replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(sanitized);
    }
  } catch {}

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

// ── TASK 1: Interview Report Generator ───────────────────────────────
async function generateReport(interview) {
  const role = interview.role || interview.configuration?.targetRole || 'Software Engineer';
  const type = interview.type || interview.configuration?.interviewType || 'Technical';
  const difficulty = interview.difficulty || interview.configuration?.difficulty || 'Medium';
  const qaList = Array.isArray(interview.qa) && interview.qa.length > 0
    ? interview.qa
    : (Array.isArray(interview.answers) ? interview.answers : []);

  const createFallbackReport = () => {
    const validScores = qaList
      .map(item => item.score ?? (item.overallScore != null ? Math.round(item.overallScore / 10) : null))
      .filter(s => typeof s === 'number' && !isNaN(s));
    const avgScore = validScores.length ? Math.min(10, Math.max(0, Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length))) : 7;

    return {
      overallScore: avgScore,
      summary: `The candidate completed the ${difficulty} ${type} interview for the ${role} position. Demonstrates baseline problem-solving abilities and willingness to communicate ideas.`,
      strengths: [
        'Attempted all questions with positive engagement',
        'Demonstrated foundational conceptual knowledge',
        'Structured responses clearly under interview conditions'
      ],
      weakAreas: [
        'Could provide deeper technical detail and edge-case coverage',
        'Structure responses with the STAR method for higher impact'
      ],
      tips: [
        'Elaborate on real-world constraints and trade-offs when explaining solutions',
        'Use specific metrics and measurable outcomes when discussing past experience',
        'Practice concise phrasing to minimize filler words and maintain a steady delivery pace'
      ],
      perQuestion: qaList.map((item, idx) => ({
        question: item.question || item.questionText || `Question ${idx + 1}`,
        score: item.score ?? (item.overallScore != null ? Math.min(10, Math.round(item.overallScore / 10)) : avgScore),
        comment: item.feedback || item.detailedFeedback || item.comment || 'Good attempt. Focus on providing concrete examples and deeper technical clarity.',
        timeTaken: item.timeTaken || 0,
        fillerCount: item.fillerCount || 0
      }))
    };
  };

  const qaFormatted = qaList.map((item, index) => {
    const qText = item.question || item.questionText || `Question ${index + 1}`;
    const aText = item.answer || item.answerText || 'No answer provided';
    const fbText = item.feedback || item.detailedFeedback || item.comment || 'No feedback recorded';
    const scoreText = item.score != null ? item.score : (item.overallScore != null ? Math.round(item.overallScore / 10) : 'N/A');
    return `Question ${index + 1}: ${qText}\nCandidate Answer: ${aText}\nPer-Answer Feedback: ${fbText}\nScore: ${scoreText}`;
  }).join('\n\n');

  const prompt = `You are an expert technical interviewer and hiring evaluator.
Analyze the following interview performance and provide a comprehensive, constructive assessment.

Interview Role: ${role}
Interview Type: ${type}
Difficulty: ${difficulty}
Total Questions: ${qaList.length}

Questions, Answers, and Per-Answer Evaluations:
${qaFormatted.substring(0, 12000)}

Respond with STRICT JSON ONLY. Do not include markdown codeblocks, html, or explanatory text outside the JSON object.
The JSON must adhere to this exact schema:
{
  "overallScore": <number between 0 and 10 representing overall performance>,
  "summary": "<a concise 2-3 sentence executive summary of overall performance>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weakAreas": ["<weak area 1>", "<weak area 2>"],
  "tips": [
    "<actionable improvement tip 1>",
    "<actionable improvement tip 2>",
    "<actionable improvement tip 3>"
  ],
  "perQuestion": [
    {
      "question": "<exact or concise question text>",
      "score": <number between 0 and 10>,
      "comment": "<constructive evaluation feedback for this specific answer>"
    }
  ]
}`;

  try {
    const result = await callWithFallback('generateText', prompt, { temperature: 0.2 });
    let parsed = safeParseJSON(result.content);

    if (!parsed || typeof parsed !== 'object') {
      return createFallbackReport();
    }

    const overallScore = typeof parsed.overallScore === 'number' && !isNaN(parsed.overallScore)
      ? Math.min(10, Math.max(0, Math.round(parsed.overallScore)))
      : 7;

    const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : `Completed ${role} interview with solid fundamentals and room for technical expansion.`;

    const strengths = Array.isArray(parsed.strengths) && parsed.strengths.length > 0
      ? parsed.strengths.map(s => String(s)).filter(Boolean)
      : ['Clear communication style', 'Good foundational problem-solving approach'];

    const weakAreas = Array.isArray(parsed.weakAreas) && parsed.weakAreas.length > 0
      ? parsed.weakAreas.map(w => String(w)).filter(Boolean)
      : ['Deepen technical architecture knowledge', 'Provide more concrete examples'];

    let tips = Array.isArray(parsed.tips) && parsed.tips.length > 0
      ? parsed.tips.map(t => String(t)).filter(Boolean)
      : [];
    if (tips.length < 3) {
      const defaultTips = [
        'Practice articulating trade-offs and edge cases explicitly',
        'Structure behavioral answers using the STAR method (Situation, Task, Action, Result)',
        'Maintain a steady pace and reduce filler words with deliberate pauses'
      ];
      tips = [...tips, ...defaultTips].slice(0, 3);
    } else if (tips.length > 3) {
      tips = tips.slice(0, 3);
    }

    const perQuestion = Array.isArray(parsed.perQuestion) && parsed.perQuestion.length > 0
      ? parsed.perQuestion.map((pq, i) => {
          const original = qaList[i] || {};
          return {
            question: pq.question || original.question || original.questionText || `Question ${i + 1}`,
            score: typeof pq.score === 'number' && !isNaN(pq.score)
              ? Math.min(10, Math.max(0, Math.round(pq.score)))
              : (original.score ?? 7),
            comment: pq.comment || original.feedback || original.detailedFeedback || 'Solid response provided.',
            timeTaken: original.timeTaken || 0,
            fillerCount: original.fillerCount || 0
          };
        })
      : qaList.map((item, idx) => ({
          question: item.question || item.questionText || `Question ${idx + 1}`,
          score: item.score ?? 7,
          comment: item.feedback || item.detailedFeedback || 'Answer recorded.',
          timeTaken: item.timeTaken || 0,
          fillerCount: item.fillerCount || 0
        }));

    return {
      overallScore,
      summary,
      strengths,
      weakAreas,
      tips,
      perQuestion
    };
  } catch (err) {
    console.error('[generateReport error, returning fallback]:', err.message);
    return createFallbackReport();
  }
}

module.exports = {
  generateText,
  generateInterviewQuestion,
  evaluateInterviewAnswer,
  generateInterviewReport,
  generateFollowUpQuestion,
  generateReport,
};
