// ── AI Provider: Groq ───────────────────────────────────────────────
const Groq = require('groq-sdk');
const config = require('../../../config');

let groqClient = null;

function getClient() {
  if (!groqClient) {
    if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
    groqClient = new Groq({ apiKey: config.GROQ_API_KEY });
  }
  return groqClient;
}

async function generateText(prompt, options = {}) {
  const start = Date.now();
  const modelName = config.GROQ_MODEL || 'openai/gpt-oss-120b';
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: modelName,
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 2048,
  });
  const text = completion.choices[0]?.message?.content || '';
  return {
    provider: 'groq',
    model: modelName,
    content: text,
    latencyMs: Date.now() - start,
    status: 'success',
    usage: completion.usage || null,
  };
}

module.exports = { generateText };
