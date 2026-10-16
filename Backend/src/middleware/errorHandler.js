const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack ? err.stack.split('\n')[1] : '');

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: messages.join(', ') } });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, error: { code: 'DUPLICATE_KEY', message: `${field} already exists` } });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid resource ID' } });
  }

  // Custom app errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, error: { code: err.code || 'APP_ERROR', message: err.message } });
  }

  // Default 500
  return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } });
};

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = { errorHandler, AppError };
