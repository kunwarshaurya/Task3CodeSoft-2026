import * as taskService from '../services/task.service.js';
import { catchAsync } from '../utils/AppError.js';
import { successResponse, paginationMeta } from '../utils/response.js';

export const createTask = catchAsync(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user._id);
  successResponse(res, { message: 'Task created successfully', data: { task } }, 201);
});

export const getTasks = catchAsync(async (req, res) => {
  const { tasks, total } = await taskService.getTasks(req.user._id, req.query);
  const meta = paginationMeta(total, req.query.page, req.query.limit);
  successResponse(res, { data: { tasks } }, 200, meta);
});

export const getTaskById = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id, req.user._id);
  successResponse(res, { data: { task } });
});

export const updateTask = catchAsync(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.user._id, req.body);
  successResponse(res, { message: 'Task updated successfully', data: { task } });
});

export const updateTaskStatus = catchAsync(async (req, res) => {
  const task = await taskService.updateTaskStatus(
    req.params.id,
    req.user._id,
    req.body.status
  );
  successResponse(res, { message: 'Task status updated', data: { task } });
});

export const deleteTask = catchAsync(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user._id);
  successResponse(res, { message: 'Task deleted successfully' });
});
