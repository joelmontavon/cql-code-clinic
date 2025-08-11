import { ZodError } from 'zod';
import { sendValidationError } from '../utils/response.js';
import logger from '../config/logger.js';

/**
 * Create validation middleware for request body
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        logger.warn('Request validation failed', {
          requestId: res.locals.requestId,
          path: req.path,
          method: req.method,
          errors: error.errors,
          body: req.body
        });

        sendValidationError(res, `Validation failed: ${errorMessage}`, {
          errors: error.errors
        });
        return;
      }

      logger.error('Unexpected validation error', {
        requestId: res.locals.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });

      sendValidationError(res, 'Invalid request data');
    }
  };
}

/**
 * Create validation middleware for query parameters
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        logger.warn('Query validation failed', {
          requestId: res.locals.requestId,
          path: req.path,
          method: req.method,
          errors: error.errors,
          query: req.query
        });

        sendValidationError(res, `Query validation failed: ${errorMessage}`, {
          errors: error.errors
        });
        return;
      }

      logger.error('Unexpected query validation error', {
        requestId: res.locals.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });

      sendValidationError(res, 'Invalid query parameters');
    }
  };
}

/**
 * Create validation middleware for route parameters
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        logger.warn('Params validation failed', {
          requestId: res.locals.requestId,
          path: req.path,
          method: req.method,
          errors: error.errors,
          params: req.params
        });

        sendValidationError(res, `Parameter validation failed: ${errorMessage}`, {
          errors: error.errors
        });
        return;
      }

      logger.error('Unexpected params validation error', {
        requestId: res.locals.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });

      sendValidationError(res, 'Invalid route parameters');
    }
  };
}