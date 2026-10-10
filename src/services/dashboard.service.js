import * as ProjectModel from '../models/project.model.js';
import Task from '../models/task.model.js';

export const getDashboardStats = async (userId) => {
  const [projects, totalTasks, completedTasks, highPriorityTasks] = await Promise.all([
    ProjectModel.getStatsByUser(userId),
    Task.countDocuments({ ownerId: userId }),
    Task.countDocuments({ ownerId: userId, status: 'completed' }),
    Task.countDocuments({ ownerId: userId, priority: 'high' }),
  ]);

  return {
    totalProjects: projects.total,
    activeProjects: projects.active,
    completedProjects: projects.completed,
    totalTasks,
    pendingTasks: totalTasks - completedTasks,
    completedTasks,
    highPriorityTasks,
  };
};
