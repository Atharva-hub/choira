import * as ProjectModel from '../models/project.model.js';
import Task from '../models/task.model.js';

// Project numbers come from MySQL, task numbers from MongoDB.
// The queries do not depend on each other, so they run in parallel.
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
    // "Pending" = everything that is not completed (todo + in_progress).
    pendingTasks: totalTasks - completedTasks,
    completedTasks,
    highPriorityTasks,
  };
};
