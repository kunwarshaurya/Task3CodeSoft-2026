import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { AppError } from '../utils/AppError.js';

/**
 * Create a new task for the given owner.
 */
export const createTask = async (taskData, ownerId) => {
  const task = await Task.create({ ...taskData, owner: ownerId });
  return task.toJSON();
};

/**
 * List tasks for a user with filtering, sorting, pagination, and search.
 */
export const getTasks = async (ownerId, query) => {
  const { page, limit, status, priority, category, search, sortBy, sortOrder } = query;

  const filter = { owner: ownerId };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  // Text search
  if (search) {
    filter.$text = { $search: search };
  }

  const sort = {};
  // Map priority to a sort-friendly value if sorting by priority
  if (sortBy === 'priority') {
    // We'll use aggregation for priority ordering; for simplicity, sort by the field directly
    sort.priority = sortOrder === 'asc' ? 1 : -1;
  } else {
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Task.countDocuments(filter),
  ]);

  return { tasks, total };
};

/**
 * Get a single task by ID, scoped to the owner.
 */
export const getTaskById = async (taskId, ownerId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError('Invalid task ID format', 400);
  }

  const task = await Task.findOne({ _id: taskId, owner: ownerId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }
  return task.toJSON();
};

/**
 * Update a task, scoped to the owner.
 */
export const updateTask = async (taskId, ownerId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError('Invalid task ID format', 400);
  }

  const task = await Task.findOne({ _id: taskId, owner: ownerId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Apply updates
  Object.keys(updateData).forEach((key) => {
    task[key] = updateData[key];
  });

  await task.save();
  return task.toJSON();
};

/**
 * Update only the status of a task.
 */
export const updateTaskStatus = async (taskId, ownerId, status) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError('Invalid task ID format', 400);
  }

  const task = await Task.findOne({ _id: taskId, owner: ownerId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  task.status = status;
  await task.save();
  return task.toJSON();
};

/**
 * Delete a task, scoped to the owner.
 */
export const deleteTask = async (taskId, ownerId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError('Invalid task ID format', 400);
  }

  const task = await Task.findOneAndDelete({ _id: taskId, owner: ownerId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }
  return true;
};
