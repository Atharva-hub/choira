import env from '../config/env.js';

// Translates any error into { statusCode, message, errors }.
// Known error types get a precise status code; everything else is a 500.
const normalizeError = (err) => {
  // 1. Errors we threw on purpose.
  if (err.name === 'ApiError') {
    return { statusCode: err.statusCode, message: err.message, errors: err.errors };
  }

  // 2. Authentication (jsonwebtoken).
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Access token has expired. Please log in again', errors: [] };
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return { statusCode: 401, message: 'Invalid access token', errors: [] };
  }

  // 3. Malformed JSON in the request body (express.json()).
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body contains invalid JSON', errors: [] };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large', errors: [] };
  }

  // 4. MySQL: unique key violation (for example a duplicate email).
  if (err.code === 'ER_DUP_ENTRY') {
    return { statusCode: 409, message: 'A record with this value already exists', errors: [] };
  }

  // 5. Mongoose: malformed id or schema validation failure.
  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid value for ${err.path}`, errors: [] };
  }
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return { statusCode: 400, message: 'Validation failed', errors };
  }

  // 6. Anything else (database down, bug in our code...). Never leak details.
  return { statusCode: 500, message: 'Internal server error', errors: [] };
};

// Express recognises an error handler by its FOUR arguments.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const { statusCode, message, errors } = normalizeError(err);

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  const body = { success: false, message, errors };
  if (statusCode >= 500 && env.nodeEnv === 'development') {
    body.stack = err.stack; // helps while developing, never sent in production
  }

  res.status(statusCode).json(body);
};

export default errorHandler;
