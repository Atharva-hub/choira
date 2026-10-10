import env from '../config/env.js';

const normalizeError = (err) => {
  if (err.name === 'ApiError') {
    return { statusCode: err.statusCode, message: err.message, errors: err.errors };
  }

  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Access token has expired. Please log in again', errors: [] };
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return { statusCode: 401, message: 'Invalid access token', errors: [] };
  }

  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body contains invalid JSON', errors: [] };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large', errors: [] };
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return { statusCode: 409, message: 'A record with this value already exists', errors: [] };
  }

  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid value for ${err.path}`, errors: [] };
  }
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return { statusCode: 400, message: 'Validation failed', errors };
  }

  return { statusCode: 500, message: 'Internal server error', errors: [] };
};

const errorHandler = (err, req, res, next) => {
  const { statusCode, message, errors } = normalizeError(err);

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  const body = { success: false, message, errors };
  if (statusCode >= 500 && env.nodeEnv === 'development') {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

export default errorHandler;
