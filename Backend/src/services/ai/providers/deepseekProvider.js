// ── AI Provider: DeepSeek (OpenAI-compatible API) ───────────────────
const axios = require('axios');
const config = require('../../../config');

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

async function generateText(prompt, options = {}) {
  const start = Date.now();
  const modelName = config.DEEPSEEK_MODEL || 'deepseek-chat';
  if (!config.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY not configured');

  const response = await axios.post(
    `${DEEPSEEK_BASE_URL}/chat/completions`,
    {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
    },
    {
      headers: { Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: config.AI_REQUEST_TIMEOUT_MS,
    }
  );

  const text = response.data.choices[0]?.message?.content || '';
  return {
    provider: 'deepseek',
    model: modelName,
    content: text,
    latencyMs: Date.now() - start,
    status: 'success',
    usage: response.data.usage || null,
  };
}

module.exports = { generateText };
