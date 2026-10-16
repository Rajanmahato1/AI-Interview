require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_URL: process.env.CLIENT_URL,
  // AI provider configs
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || process.env.DEEPEEK_API_KEY,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  AI_PRIMARY_PROVIDER: process.env.AI_PRIMARY_PROVIDER || 'gemini',
  AI_FALLBACK_PROVIDERS: process.env.AI_FALLBACK_PROVIDERS ? process.env.AI_FALLBACK_PROVIDERS.split(',') : ['groq', 'deepseek'],
  AI_REQUEST_TIMEOUT_MS: parseInt(process.env.AI_REQUEST_TIMEOUT_MS) || 30000,
  AI_MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES) || 1,
};
