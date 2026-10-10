import mongoose from 'mongoose';

export const TASK_STATUSES = ['todo', 'in_progress', 'completed'];
export const TASK_PRIORITIES = ['low', 'medium', 'high'];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium' },
    dueDate: { type: Date, default: null },

    projectId: { type: Number, required: true },
    ownerId: { type: Number, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (doc, { _id, ...rest }) => ({ id: _id.toString(), ...rest }),
    },
  },
);

taskSchema.index({ ownerId: 1, createdAt: -1 });
taskSchema.index({ ownerId: 1, projectId: 1 });
taskSchema.index({ ownerId: 1, status: 1, priority: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
