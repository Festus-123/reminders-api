// src/middlewares/errorHandlerMiddleware.js
import ERROR_MESSAGES from '../constants/errorMessages.js';

function errorHandlerMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  // Every error that reaches this point gets logged — a silent 500 in production
  // is strictly worse than a noisy one, because at least a noisy one leaves a trail.
  console.error(`[${req.method} ${req.originalUrl}] ${statusCode}: ${err.stack || err.message}`);

  res.status(statusCode).json({ error: message });
}

export default errorHandlerMiddleware;