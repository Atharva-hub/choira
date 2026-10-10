import ApiError from '../utils/ApiError.js';
import * as ProjectModel from '../models/project.model.js';
import Task from '../models/task.model.js';

export const createProject = async (userId, data) => {
  const projectId = await ProjectModel.create({ userId, ...data });
  return ProjectModel.findByIdAndUser(projectId, userId);
};

export const listProjects = (userId, filters) => ProjectModel.findAllByUser(userId, filters);

export const getProjectById = async (userId, projectId) => {
  const project = await ProjectModel.findByIdAndUser(projectId, userId);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  return project;
};

export const updateProject = async (userId, projectId, data) => {
  await getProjectById(userId, projectId);
  await ProjectModel.updateByIdAndUser(projectId, userId, data);
  return ProjectModel.findByIdAndUser(projectId, userId);
};

export const deleteProject = async (userId, projectId) => {
  const deleted = await ProjectModel.deleteByIdAndUser(projectId, userId);
  if (!deleted) {
    throw ApiError.notFound('Project not found');
  }

  const { deletedCount } = await Task.deleteMany({ ownerId: userId, projectId });
  return { deletedTasks: deletedCount };
};
