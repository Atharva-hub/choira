import Joi from 'joi';
import { TASK_PRIORITIES, TASK_STATUSES } from '../models/task.model.js';

const title = Joi.string().trim().min(1).max(200);
const description = Joi.string().trim().max(2000).allow('');
const status = Joi.string().valid(...TASK_STATUSES);
const priority = Joi.string().valid(...TASK_PRIORITIES);
const dueDate = Joi.date().iso().allow(null);
const projectId = Joi.number().integer().positive().messages({
  'number.base': 'projectId must be a valid project id',
  'number.integer': 'projectId must be a valid project id',
  'number.positive': 'projectId must be a valid project id',
  'number.unsafe': 'projectId must be a valid project id',
});

export const taskIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'id must be a valid task id',
    'string.length': 'id must be a valid task id',
  }),
});

export const createTaskSchema = Joi.object({
  title: title.required(),
  description,
  status,
  priority,
  dueDate,
  projectId: projectId.required(),
});

export const updateTaskSchema = Joi.object({
  title,
  description,
  status,
  priority,
  dueDate,
  projectId,
})
  .min(1)
  .messages({
    'object.min': 'Provide at least one of: title, description, status, priority, dueDate, projectId',
  });

const TASK_SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'title'];

export const listTasksQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status,
  priority,
  projectId,
  sortBy: Joi.string().valid(...TASK_SORT_FIELDS).default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});
