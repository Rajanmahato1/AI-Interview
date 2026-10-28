require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── CORS whitelist ─────────────────────────────────────────────────
// CLIENT_URL can be a comma-separated list for multi-origin support
// e.g. "http://localhost:5173,https://my-app.vercel.app"
const rawOrigins = (config.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);



// Always allow localhost:5173 in development
if (config.NODE_ENV !== 'production' && !rawOrigins.includes('https://ai-interview1-topaz.vercel.app/')) {
  rawOrigins.push('https://ai-interview1-topaz.vercel.app/');
}

const corsOptions = {
  origin: rawOrigins.length > 0
    ? (origin, cb) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return cb(null, true);
        if (rawOrigins.includes(origin)) return cb(null, true);
        // Allow any vercel.app subdomain as a convenience
        if (/\.vercel\.app$/.test(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`), false);
      }
    : '*',
  credentials: true,
};

// ── Core middleware ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors(corsOptions));
// Handle CORS preflight for all routes
app.options('*', cors(corsOptions));
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
if (config.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Global rate limiter ────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded, try again in 15 minutes' } },
}));

// ── Health check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: config.NODE_ENV,
    ts: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/profile', require('./routes/profile'));

// ── 404 handler ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});

// ── Error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
