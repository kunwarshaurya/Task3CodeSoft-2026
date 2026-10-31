import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
} from '../validators/task.validator.js';

const router = Router();

// All task routes require authentication
router.use(protect);

router
  .route('/')
  .get(validate(taskQuerySchema, 'query'), taskController.getTasks)
  .post(validate(createTaskSchema), taskController.createTask);

router
  .route('/:id')
  .get(taskController.getTaskById)
  .patch(validate(updateTaskSchema), taskController.updateTask)
  .delete(taskController.deleteTask);

router.patch('/:id/status', validate(updateStatusSchema), taskController.updateTaskStatus);

export default router;
