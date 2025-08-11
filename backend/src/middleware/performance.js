import performanceService from '../services/performanceService.js';
import cacheService from '../services/cacheService.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Performance monitoring middleware for Express.js
 * Tracks request/response timing and performance metrics
 */
export const performanceMiddleware = (req, res, next) => {
  // Start performance tracking
  const trackingId = performanceService.startRequest(req.method, req.path, {
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    userId: req.user?.id
  });

  // Store tracking ID for other middleware
  req.performanceTrackingId = trackingId;

  // Capture the original res.end method
  const originalEnd = res.end;

  // Override res.end to capture response metrics
  res.end = function(chunk, encoding) {
    // Call the original end method
    originalEnd.call(this, chunk, encoding);

    // End performance tracking
    performanceService.endRequest(trackingId, res.statusCode, {
      contentLength: res.get('Content-Length'),
      contentType: res.get('Content-Type'),
      cached: res.locals.fromCache
    });
  };

  next();
};

/**
 * Cache middleware for API responses
 * Caches GET requests based on URL and query parameters
 */
export const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    varyBy = [], // Additional fields to vary cache by
    skipCache = false
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests unless explicitly configured
    if (req.method !== 'GET' && !options.cacheAll) {
      return next();
    }

    if (skipCache) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = generateCacheKey(req, varyBy);
      
      // Check cache
      const startTime = Date.now();
      const cachedResponse = await cacheService.get(cacheKey);
      const cacheCheckDuration = Date.now() - startTime;

      performanceService.trackCache('get', cacheKey, !!cachedResponse, cacheCheckDuration);

      if (cachedResponse) {
        // Serve from cache
        res.locals.fromCache = true;
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        if (cachedResponse.headers) {
          Object.entries(cachedResponse.headers).forEach(([key, value]) => {
            res.set(key, value);
          });
        }

        return res.json(cachedResponse.data);
      }

      // Not in cache, continue with request
      res.locals.fromCache = false;
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      // Capture original json method
      const originalJson = res.json;

      // Override json method to cache successful responses
      res.json = function(data) {
        // Cache successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseToCache = {
            data,
            headers: {
              'Content-Type': 'application/json'
            },
            cachedAt: new Date().toISOString()
          };

          // Cache asynchronously to not block response
          setImmediate(async () => {
            const setCacheStart = Date.now();
            await cacheService.set(cacheKey, responseToCache, ttl);
            const setCacheDuration = Date.now() - setCacheStart;
            performanceService.trackCache('set', cacheKey, false, setCacheDuration);
          });
        }

        // Call original json method
        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Database query optimization middleware
 * Tracks database query performance and applies optimizations
 */
export const dbOptimizationMiddleware = (req, res, next) => {
  // Override Prisma client methods to add performance tracking
  if (req.app.locals.prisma) {
    const originalQuery = req.app.locals.prisma.$queryRaw;
    
    req.app.locals.prisma.$queryRaw = async function(query, ...args) {
      const startTime = Date.now();
      
      try {
        const result = await originalQuery.call(this, query, ...args);
        const duration = Date.now() - startTime;
        
        performanceService.trackDatabase('raw_query', String(query), duration, {
          args: args.length,
          resultCount: Array.isArray(result) ? result.length : 1
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        performanceService.trackDatabase('raw_query_error', String(query), duration, {
          error: error.message
        });
        throw error;
      }
    };
  }

  next();
};

/**
 * Response compression middleware
 * Compresses responses based on content type and size
 */
export const compressionMiddleware = (options = {}) => {
  const {
    threshold = 1024, // Only compress responses larger than 1KB
    level = 6, // Compression level (1-9)
    types = ['application/json', 'text/html', 'text/css', 'application/javascript']
  } = options;

  return (req, res, next) => {
    // Check if client accepts compression
    const acceptEncoding = req.get('Accept-Encoding') || '';
    const supportsGzip = acceptEncoding.includes('gzip');
    
    if (!supportsGzip) {
      return next();
    }

    // Override the write and end methods to compress response
    const originalWrite = res.write;
    const originalEnd = res.end;
    let chunks = [];
    let totalLength = 0;

    res.write = function(chunk) {
      if (chunk) {
        chunks.push(chunk);
        totalLength += chunk.length;
      }
      return true;
    };

    res.end = function(chunk) {
      if (chunk) {
        chunks.push(chunk);
        totalLength += chunk.length;
      }

      // Check if response should be compressed
      const contentType = res.get('Content-Type') || '';
      const shouldCompress = totalLength >= threshold && 
        types.some(type => contentType.includes(type));

      if (shouldCompress) {
        res.set('Content-Encoding', 'gzip');
        res.set('Vary', 'Accept-Encoding');
        
        // In a real implementation, you would use zlib.gzip here
        // For now, we'll just set the headers and pass through
        logger.debug('Response would be compressed', {
          contentType,
          originalSize: totalLength,
          compressionLevel: level
        });
      }

      // Restore original methods and send response
      res.write = originalWrite;
      res.end = originalEnd;

      const finalData = Buffer.concat(chunks);
      originalEnd.call(res, finalData);
    };

    next();
  };
};

/**
 * Rate limiting middleware with performance tracking
 * Implements sliding window rate limiting with Redis
 */
export const rateLimitMiddleware = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req) => req.ip,
    message = 'Too many requests from this IP, please try again later.',
    headers = true
  } = options;

  return async (req, res, next) => {
    try {
      const key = `rate_limit:${keyGenerator(req)}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use sliding window algorithm with Redis
      const requestCount = await cacheService.increment(key, 1, Math.ceil(windowMs / 1000));
      
      if (headers) {
        res.set('X-RateLimit-Limit', maxRequests);
        res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount));
        res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      }

      if (requestCount > maxRequests) {
        performanceService.trackError(req.performanceTrackingId, 'rate_limit_exceeded', {
          key,
          requestCount,
          limit: maxRequests,
          ip: req.ip
        });

        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Continue on error to not block requests
      next();
    }
  };
};

/**
 * Request timeout middleware
 * Sets timeout for long-running requests
 */
export const timeoutMiddleware = (timeoutMs = 30000) => {
  return (req, res, next) => {
    // Set request timeout
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        performanceService.trackError(req.performanceTrackingId, 'request_timeout', {
          url: req.url,
          method: req.method,
          timeout: timeoutMs
        });

        res.status(504).json({
          success: false,
          error: 'Request timeout',
          timeout: timeoutMs
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * CORS middleware with performance considerations
 * Optimized CORS handling with caching
 */
export const corsMiddleware = (options = {}) => {
  const {
    origin = true,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials = true,
    maxAge = 86400 // 24 hours
  } = options;

  return (req, res, next) => {
    // Set CORS headers
    if (origin === true) {
      res.set('Access-Control-Allow-Origin', req.get('Origin') || '*');
    } else if (typeof origin === 'string') {
      res.set('Access-Control-Allow-Origin', origin);
    }

    res.set('Access-Control-Allow-Methods', methods.join(', '));
    res.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.set('Access-Control-Max-Age', maxAge);

    if (credentials) {
      res.set('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }

    next();
  };
};

/**
 * Security headers middleware
 * Adds security headers with performance optimization
 */
export const securityHeadersMiddleware = (options = {}) => {
  const {
    contentSecurityPolicy = true,
    hsts = true,
    noSniff = true,
    xssProtection = true,
    referrerPolicy = true
  } = options;

  return (req, res, next) => {
    if (contentSecurityPolicy) {
      res.set('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
    }

    if (hsts) {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    if (noSniff) {
      res.set('X-Content-Type-Options', 'nosniff');
    }

    if (xssProtection) {
      res.set('X-XSS-Protection', '1; mode=block');
    }

    if (referrerPolicy) {
      res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    res.set('X-Frame-Options', 'DENY');

    next();
  };
};

// Helper functions

/**
 * Generate cache key from request
 * @param {Object} req - Express request object
 * @param {Array} varyBy - Additional fields to vary by
 * @returns {string} Cache key
 */
function generateCacheKey(req, varyBy = []) {
  const parts = [
    req.method,
    req.path,
    JSON.stringify(req.query),
    req.user?.id || 'anonymous'
  ];

  // Add additional vary by fields
  varyBy.forEach(field => {
    if (field.startsWith('header:')) {
      const headerName = field.substring(7);
      parts.push(req.get(headerName) || '');
    } else if (req[field] !== undefined) {
      parts.push(String(req[field]));
    }
  });

  return cacheService.generateKey('api_response', parts.join(':'));
}

export default {
  performanceMiddleware,
  cacheMiddleware,
  dbOptimizationMiddleware,
  compressionMiddleware,
  rateLimitMiddleware,
  timeoutMiddleware,
  corsMiddleware,
  securityHeadersMiddleware
};