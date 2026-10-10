import * as dashboardService from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getDashboard = async (req, res) => {
  const stats = await dashboardService.getDashboardStats(req.user.id);
  sendSuccess(res, { message: 'Dashboard statistics fetched successfully', data: { stats } });
};
