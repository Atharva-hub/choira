import ApiError from '../utils/ApiError.js';
import Task from '../models/task.model.js';
import { getProjectById } from './project.service.js';

export const createTask = async (userId, data) => {
  await getProjectById(userId, data.projectId);

  return Task.create({ ...data, ownerId: userId });
};

export const listTasks = async (userId, { page, limit, status, priority, projectId, sortBy, order }) => {
  const filter = { ownerId: userId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (projectId) filter.projectId = projectId;

  const direction = order === 'asc' ? 1 : -1;

  const [tasks, totalRecords] = await Promise.all([
    Task.find(filter)
      .sort({ [sortBy]: direction, _id: direction })
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    tasks,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export const getTaskById = async (userId, taskId) => {
  const task = await Task.findOne({ _id: taskId, ownerId: userId });
  if (!task) {
    throw ApiError.notFound('Task not found');
  }
  return task;
};

export const updateTask = async (userId, taskId, data) => {
  const task = await getTaskById(userId, taskId);

  if (data.projectId !== undefined && data.projectId !== task.projectId) {
    await getProjectById(userId, data.projectId);
  }

  task.set(data);
  return task.save();
};

export const deleteTask = async (userId, taskId) => {
  const task = await Task.findOneAndDelete({ _id: taskId, ownerId: userId });
  if (!task) {
    throw ApiError.notFound('Task not found');
  }
};
