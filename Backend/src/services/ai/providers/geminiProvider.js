// ── AI Provider: Google Gemini ──────────────────────────────────────
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../../config');

let geminiClient = null;

function getClient() {
  if (!geminiClient) {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
    geminiClient = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return geminiClient;
}

async function generateText(prompt, options = {}) {
  const start = Date.now();
  const modelName = config.GEMINI_MODEL || 'gemini-3.6-flash';
  const client = getClient();
  const model = client.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return {
    provider: 'gemini',
    model: modelName,
    content: text,
    latencyMs: Date.now() - start,
    status: 'success',
    usage: result.response.usageMetadata || null,
  };
}

module.exports = { generateText };
