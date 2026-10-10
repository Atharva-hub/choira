import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const register = async (req, res) => {
  const data = await authService.register(req.valid.body);
  sendSuccess(res, { statusCode: 201, message: 'User registered successfully', data });
};

export const login = async (req, res) => {
  const data = await authService.login(req.valid.body);
  sendSuccess(res, { message: 'Login successful', data });
};

export const getMe = async (req, res) => {
  sendSuccess(res, { message: 'Profile fetched successfully', data: { user: req.user } });
};

export const updateProfile = async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.valid.body);
  sendSuccess(res, { message: 'Profile updated successfully', data: { user } });
};
