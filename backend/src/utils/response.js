import { v4 as uuidv4 } from 'uuid';
import { isDevelopment } from '../config/env.js';

// HTTP Status Codes
export const HttpStatusCode = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// Common error types
export const ErrorType = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CQL_EXECUTION_ERROR: 'CQL_EXECUTION_ERROR',
  CQL_SERVICE_UNAVAILABLE: 'CQL_SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  NOT_FOUND: 'NOT_FOUND'
};

/**
 * Send successful API response
 */
export function sendSuccess(res, data, message, statusCode = HttpStatusCode.OK) {
  const response = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || uuidv4()
  };

  return res.status(statusCode).json(response);
}

/**
 * Send error API response
 */
export function sendError(res, error, message, statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR, stack) {
  const response = {
    success: false,
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || uuidv4()
  };

  // Include stack trace in development only
  if (stack && isDevelopment) {
    response.stack = stack;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
export function sendValidationError(res, message, details) {
  const response = {
    success: false,
    error: 'VALIDATION_ERROR',
    message,
    statusCode: HttpStatusCode.BAD_REQUEST,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || uuidv4(),
    ...(details && { details })
  };

  return res.status(HttpStatusCode.BAD_REQUEST).json(response);
}

/**
 * Send not found error response
 */
export function sendNotFound(res, message = 'Resource not found') {
  return sendError(res, 'NOT_FOUND', message, HttpStatusCode.NOT_FOUND);
}

/**
 * Send rate limit error response
 */
export function sendRateLimitError(res, message = 'Too many requests') {
  return sendError(res, 'RATE_LIMIT_EXCEEDED', message, HttpStatusCode.TOO_MANY_REQUESTS);
}

/**
 * Send service unavailable error response
 */
export function sendServiceUnavailable(res, message = 'Service temporarily unavailable') {
  return sendError(res, 'SERVICE_UNAVAILABLE', message, HttpStatusCode.SERVICE_UNAVAILABLE);
}