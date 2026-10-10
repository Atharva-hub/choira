import ApiError from '../utils/ApiError.js';
import Task from '../models/task.model.js';
import { getProjectById } from './project.service.js';

export const createTask = async (userId, data) => {
  // Throws 404 unless the project exists AND belongs to this user.
  await getProjectById(userId, data.projectId);

  return Task.create({ ...data, ownerId: userId });
};

export const listTasks = async (userId, { page, limit, status, priority, projectId }) => {
  // ownerId is always part of the filter: users only ever see their own tasks.
  const filter = { ownerId: userId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (projectId) filter.projectId = projectId;

  const [tasks, totalRecords] = await Promise.all([
    Task.find(filter)
      .sort({ createdAt: -1, _id: -1 })
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

  // Moving the task to another project? That project must be ours too.
  if (data.projectId !== undefined && data.projectId !== task.projectId) {
    await getProjectById(userId, data.projectId);
  }

  task.set(data);
  return task.save(); // save() re-runs the Mongoose schema validation
};

export const deleteTask = async (userId, taskId) => {
  const task = await Task.findOneAndDelete({ _id: taskId, ownerId: userId });
  if (!task) {
    throw ApiError.notFound('Task not found');
  }
};
