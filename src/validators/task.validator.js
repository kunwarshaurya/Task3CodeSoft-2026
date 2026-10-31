import { z } from 'zod';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'in-progress', 'completed'];

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .default(''),
  status: z.enum(STATUSES).optional().default('pending'),
  priority: z.enum(PRIORITIES).optional().default('medium'),
  category: z
    .string()
    .trim()
    .max(50, 'Category cannot exceed 50 characters')
    .optional()
    .default('general'),
  dueDate: z
    .string()
    .datetime({ message: 'Due date must be a valid ISO 8601 date' })
    .optional()
    .nullable(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z
    .string()
    .trim()
    .max(50, 'Category cannot exceed 50 characters')
    .optional(),
  dueDate: z
    .string()
    .datetime({ message: 'Due date must be a valid ISO 8601 date' })
    .optional()
    .nullable(),
});

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES, {
    required_error: 'Status is required',
    invalid_type_error: `Status must be one of: ${STATUSES.join(', ')}`,
  }),
});

// Query parameter validation for listing/filtering tasks
export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z.string().trim().max(50).optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'status'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
