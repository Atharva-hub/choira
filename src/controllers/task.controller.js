import * as taskService from '../services/task.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const createTask = async (req, res) => {
  const task = await taskService.createTask(req.user.id, req.valid.body);
  sendSuccess(res, { statusCode: 201, message: 'Task created successfully', data: { task } });
};

export const listTasks = async (req, res) => {
  const { tasks, pagination } = await taskService.listTasks(req.user.id, req.valid.query);
  sendSuccess(res, { message: 'Tasks fetched successfully', data: { tasks }, pagination });
};

export const getTask = async (req, res) => {
  const task = await taskService.getTaskById(req.user.id, req.valid.params.id);
  sendSuccess(res, { message: 'Task fetched successfully', data: { task } });
};

export const updateTask = async (req, res) => {
  const task = await taskService.updateTask(req.user.id, req.valid.params.id, req.valid.body);
  sendSuccess(res, { message: 'Task updated successfully', data: { task } });
};

export const deleteTask = async (req, res) => {
  await taskService.deleteTask(req.user.id, req.valid.params.id);
  sendSuccess(res, { message: 'Task deleted successfully' });
};
