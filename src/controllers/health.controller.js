import * as healthService from '../services/health.service.js';
import ApiError from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getHealth = async (req, res) => {
  const databases = await healthService.checkDatabases();
  const unavailable = Object.keys(databases).filter((name) => databases[name] !== 'up');

  if (unavailable.length > 0) {
    const errors = unavailable.map((name) => ({ field: name, message: `${name} is not reachable` }));
    throw new ApiError(503, 'Service unavailable', errors);
  }

  sendSuccess(res, {
    message: 'API is running',
    data: { databases, uptimeSeconds: Math.round(process.uptime()) },
  });
};
