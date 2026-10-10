// Every successful response in the API goes through this helper,
// so clients always receive the same shape:
//   { success: true, message, data, pagination? }
export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, pagination } = {}) => {
  const body = { success: true, message, data };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
};
