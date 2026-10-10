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

    // These two ids point at rows in MySQL (projects.id and users.id).
    // MongoDB cannot enforce a foreign key across databases, so the
    // service layer checks project ownership before every write.
    projectId: { type: Number, required: true },
    ownerId: { type: Number, required: true },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
    versionKey: false,
    toJSON: {
      // Send "id" instead of MongoDB's "_id" so tasks look like projects.
      transform: (doc, { _id, ...rest }) => ({ id: _id.toString(), ...rest }),
    },
  },
);

// Indexes that match how we query: always by owner, newest first,
// optionally narrowed by project, status or priority.
taskSchema.index({ ownerId: 1, createdAt: -1 });
taskSchema.index({ ownerId: 1, projectId: 1 });
taskSchema.index({ ownerId: 1, status: 1, priority: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
