import Joi from 'joi';
import { PROJECT_STATUSES } from '../models/project.model.js';

const name = Joi.string().trim().min(1).max(150);
const description = Joi.string().trim().max(2000).allow('', null);
const status = Joi.string().valid(...PROJECT_STATUSES);

const INVALID_ID_MESSAGE = 'id must be a valid project id';

export const projectIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': INVALID_ID_MESSAGE,
    'number.integer': INVALID_ID_MESSAGE,
    'number.positive': INVALID_ID_MESSAGE,
    'number.unsafe': INVALID_ID_MESSAGE,
  }),
});

export const createProjectSchema = Joi.object({
  name: name.required(),
  description,
  status,
});

export const updateProjectSchema = Joi.object({
  name,
  description,
  status,
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one of: name, description, status' });

export const listProjectsQuerySchema = Joi.object({
  status,
});
