import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import projectRoutes from './project.routes.js';
import taskRoutes from './task.routes.js';

// Everything here is mounted under /api (see app.js).
const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
