import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Creates an Express middleware that validates req[source] against a Zod schema.
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {'body'|'query'|'params'} source - Request property to validate
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const messages = result.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      return next(new AppError(messages.join('; '), 400));
    }
    // Replace with parsed/coerced data
    req[source] = result.data;
    next();
  };
};
