import ApiError from '../utils/ApiError.js';

// validate(schema, 'body' | 'query' | 'params') returns a middleware that
// checks that part of the request against a Joi schema.
//  - on failure: forwards a 400 with one entry per invalid field
//  - on success: stores the cleaned values on req.valid[source]
// Controllers read from req.valid, never from the raw request.
const validate = (schema, source = 'body') => (req, res, next) => {
  const { value, error } = schema.validate(req[source] ?? {}, {
    abortEarly: false, // report every problem, not only the first
    stripUnknown: true, // silently drop fields we did not ask for
    convert: true, // "10" -> 10 for query strings and URL params
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      // Rules about the whole object (e.g. "send at least one field") have
      // no path, so fall back to the related field or the request part.
      field: detail.path.join('.') || detail.context?.peer || source,
      message: detail.message.replaceAll('"', ''),
    }));
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.valid = { ...req.valid, [source]: value };
  return next();
};

export default validate;
