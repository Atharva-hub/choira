import * as projectService from '../services/project.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const createProject = async (req, res) => {
  const project = await projectService.createProject(req.user.id, req.valid.body);
  sendSuccess(res, { statusCode: 201, message: 'Project created successfully', data: { project } });
};

export const listProjects = async (req, res) => {
  const projects = await projectService.listProjects(req.user.id, req.valid.query);
  sendSuccess(res, { message: 'Projects fetched successfully', data: { projects } });
};

export const getProject = async (req, res) => {
  const project = await projectService.getProjectById(req.user.id, req.valid.params.id);
  sendSuccess(res, { message: 'Project fetched successfully', data: { project } });
};

export const updateProject = async (req, res) => {
  const project = await projectService.updateProject(req.user.id, req.valid.params.id, req.valid.body);
  sendSuccess(res, { message: 'Project updated successfully', data: { project } });
};

export const deleteProject = async (req, res) => {
  const data = await projectService.deleteProject(req.user.id, req.valid.params.id);
  sendSuccess(res, { message: 'Project deleted successfully', data });
};
