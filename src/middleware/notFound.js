import ApiError from '../utils/ApiError.js';

// Runs only when no route matched the request.
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

export default notFound;
