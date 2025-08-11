import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to add unique request ID to each request
 */
export function requestIdMiddleware(req, res, next) {
  const requestId = req.header('x-request-id') || uuidv4();
  
  // Store in response locals for access in handlers
  res.locals.requestId = requestId;
  
  // Add to response headers
  res.setHeader('x-request-id', requestId);
  
  next();
}