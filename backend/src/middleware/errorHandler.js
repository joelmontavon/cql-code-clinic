import { sendError, sendNotFound, HttpStatusCode } from '../utils/response.js';
import logger from '../config/logger.js';
import { isDevelopment } from '../config/env.js';

/**
 * Global error handling middleware
 */
export function errorHandler(error, req, res, next) {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  const requestId = res.locals.requestId;

  logger.error('Unhandled error in request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    error: error.message,
    stack: error.stack,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    sendError(
      res,
      'VALIDATION_ERROR',
      error.message,
      HttpStatusCode.BAD_REQUEST,
      isDevelopment ? error.stack : undefined
    );
    return;
  }

  if (error.name === 'UnauthorizedError') {
    sendError(
      res,
      'UNAUTHORIZED',
      'Authentication required',
      HttpStatusCode.UNAUTHORIZED,
      isDevelopment ? error.stack : undefined
    );
    return;
  }

  if (error.name === 'ForbiddenError') {
    sendError(
      res,
      'FORBIDDEN',
      'Access denied',
      HttpStatusCode.FORBIDDEN,
      isDevelopment ? error.stack : undefined
    );
    return;
  }

  // Handle CQL service specific errors
  if (error.message.includes('CQL Execution Service')) {
    sendError(
      res,
      'CQL_SERVICE_ERROR',
      error.message,
      HttpStatusCode.BAD_GATEWAY,
      isDevelopment ? error.stack : undefined
    );
    return;
  }

  // Default internal server error
  sendError(
    res,
    'INTERNAL_ERROR',
    isDevelopment ? error.message : 'An unexpected error occurred',
    HttpStatusCode.INTERNAL_SERVER_ERROR,
    isDevelopment ? error.stack : undefined
  );
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req, res) {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    query: req.query,
    requestId: res.locals.requestId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  sendNotFound(res, `Route ${req.method} ${req.path} not found`);
}