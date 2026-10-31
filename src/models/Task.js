import mongoose from 'mongoose';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'in-progress', 'completed'];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'medium',
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
      default: 'general',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must belong to a user'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for common query patterns
taskSchema.index({ owner: 1, status: 1 });
taskSchema.index({ owner: 1, priority: 1 });
taskSchema.index({ owner: 1, category: 1 });
taskSchema.index({ owner: 1, dueDate: 1 });
taskSchema.index({ owner: 1, createdAt: -1 });
// Text index for search
taskSchema.index({ title: 'text', description: 'text' });

// Auto-set completedAt when status changes to completed
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = null;
    }
  }
  next();
});

export { PRIORITIES, STATUSES };
const Task = mongoose.model('Task', taskSchema);
export default Task;
