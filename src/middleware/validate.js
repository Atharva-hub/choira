import ApiError from '../utils/ApiError.js';

const validate = (schema, source = 'body') => (req, res, next) => {
  const { value, error } = schema.validate(req[source] ?? {}, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.') || detail.context?.peer || source,
      message: detail.message.replaceAll('"', ''),
    }));
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.valid = { ...req.valid, [source]: value };
  return next();
};

export default validate;
