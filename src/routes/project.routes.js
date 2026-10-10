import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import authenticate from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
} from '../validators/project.validator.js';

const router = Router();

// Every project route requires a logged-in user.
router.use(authenticate);

router
  .route('/')
  .post(validate(createProjectSchema), projectController.createProject)
  .get(validate(listProjectsQuerySchema, 'query'), projectController.listProjects);

router
  .route('/:id')
  .get(validate(projectIdParamSchema, 'params'), projectController.getProject)
  .put(
    validate(projectIdParamSchema, 'params'),
    validate(updateProjectSchema),
    projectController.updateProject,
  )
  .delete(validate(projectIdParamSchema, 'params'), projectController.deleteProject);

export default router;
