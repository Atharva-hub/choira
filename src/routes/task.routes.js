import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import authenticate from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from '../validators/task.validator.js';

const router = Router();

// Every task route requires a logged-in user.
router.use(authenticate);

router
  .route('/')
  .post(validate(createTaskSchema), taskController.createTask)
  .get(validate(listTasksQuerySchema, 'query'), taskController.listTasks);

router
  .route('/:id')
  .get(validate(taskIdParamSchema, 'params'), taskController.getTask)
  .put(validate(taskIdParamSchema, 'params'), validate(updateTaskSchema), taskController.updateTask)
  .delete(validate(taskIdParamSchema, 'params'), taskController.deleteTask);

export default router;
