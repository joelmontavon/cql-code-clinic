import winston from 'winston';
import performanceService from './performanceService.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Database Query Optimization Service
 * Provides query optimization, connection pooling, and performance monitoring
 */
export class DatabaseOptimizationService {
  constructor() {
    this.queryCache = new Map();
    this.connectionPools = new Map();
    this.queryStats = {
      executed: 0,
      optimized: 0,
      cached: 0,
      slowQueries: 0
    };
    
    this.config = {
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000, // 30 seconds
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // 1 second
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 100,
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 300000, // 5 minutes
      queryCache: {
        maxSize: 1000,
        ttl: 300000 // 5 minutes
      }
    };

    this.optimizationRules = [
      this.optimizeSelectQueries.bind(this),
      this.optimizeJoinQueries.bind(this),
      this.optimizeWhereClause.bind(this),
      this.optimizeOrderBy.bind(this),
      this.optimizePagination.bind(this),
    ];

    this.startQueryCacheCleanup();
  }

  /**
   * Optimize database query before execution
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters
   * @param {Object} options - Query options
   * @returns {Object} Optimized query and parameters
   */
  async optimizeQuery(query, params = [], options = {}) {
    const startTime = Date.now();
    let optimizedQuery = query.trim();
    let optimizedParams = [...params];
    let wasOptimized = false;

    try {
      // Apply optimization rules
      for (const rule of this.optimizationRules) {
        const result = await rule(optimizedQuery, optimizedParams, options);
        if (result.optimized) {
          optimizedQuery = result.query;
          optimizedParams = result.params || optimizedParams;
          wasOptimized = true;
        }
      }

      // Track optimization metrics
      this.queryStats.executed++;
      if (wasOptimized) {
        this.queryStats.optimized++;
      }

      const duration = Date.now() - startTime;
      performanceService.trackDatabase('query_optimization', optimizedQuery, duration, {
        wasOptimized,
        originalLength: query.length,
        optimizedLength: optimizedQuery.length
      });

      return {
        query: optimizedQuery,
        params: optimizedParams,
        wasOptimized,
        optimizationTime: duration
      };

    } catch (error) {
      logger.error('Query optimization error:', error);
      return {
        query,
        params,
        wasOptimized: false,
        error: error.message
      };
    }
  }

  /**
   * Execute query with optimization and caching
   * @param {Object} client - Database client (Prisma, etc.)
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Execution options
   * @returns {Promise<any>} Query result
   */
  async executeOptimizedQuery(client, query, params = [], options = {}) {
    const {
      useCache = true,
      cacheKey = null,
      cacheTTL = this.config.queryCache.ttl,
      timeout = this.config.queryTimeout
    } = options;

    const executionId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Generate cache key if not provided
      const finalCacheKey = cacheKey || this.generateQueryCacheKey(query, params);

      // Check cache first
      if (useCache && this.queryCache.has(finalCacheKey)) {
        const cachedResult = this.queryCache.get(finalCacheKey);
        if (this.isCacheEntryValid(cachedResult)) {
          this.queryStats.cached++;
          performanceService.trackDatabase('query_cache_hit', query, Date.now() - startTime, {
            executionId,
            cached: true
          });
          return cachedResult.data;
        } else {
          this.queryCache.delete(finalCacheKey);
        }
      }

      // Optimize query
      const optimized = await this.optimizeQuery(query, params, options);

      // Execute query with timeout
      const result = await Promise.race([
        this.executeWithMetrics(client, optimized.query, optimized.params, executionId),
        this.createTimeoutPromise(timeout, executionId)
      ]);

      const executionTime = Date.now() - startTime;

      // Check for slow queries
      if (executionTime > this.config.slowQueryThreshold) {
        this.queryStats.slowQueries++;
        logger.warn('Slow query detected:', {
          executionId,
          query: query.substring(0, 200),
          executionTime,
          wasOptimized: optimized.wasOptimized
        });
      }

      // Cache successful results
      if (useCache && result) {
        this.cacheQueryResult(finalCacheKey, result, cacheTTL);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      performanceService.trackDatabase('query_error', query, executionTime, {
        executionId,
        error: error.message
      });
      logger.error('Query execution error:', error);
      throw error;
    }
  }

  /**
   * Execute query with performance metrics
   * @param {Object} client - Database client
   * @param {string} query - Optimized query
   * @param {Array} params - Query parameters
   * @param {string} executionId - Execution ID for tracking
   * @returns {Promise<any>} Query result
   */
  async executeWithMetrics(client, query, params, executionId) {
    const startTime = Date.now();

    try {
      let result;

      // Handle different client types
      if (client.$queryRaw) {
        // Prisma client
        result = await client.$queryRaw(query, ...params);
      } else if (client.query) {
        // Generic database client
        result = await client.query(query, params);
      } else {
        throw new Error('Unsupported database client type');
      }

      const executionTime = Date.now() - startTime;
      performanceService.trackDatabase('query_success', query, executionTime, {
        executionId,
        resultCount: Array.isArray(result) ? result.length : 1
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      performanceService.trackDatabase('query_execution_error', query, executionTime, {
        executionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Optimize SELECT queries
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Options
   * @returns {Object} Optimization result
   */
  async optimizeSelectQueries(query, params, options) {
    const lowerQuery = query.toLowerCase();
    
    if (!lowerQuery.includes('select')) {
      return { optimized: false };
    }

    let optimizedQuery = query;
    let wasOptimized = false;

    // Add LIMIT if not present and not using aggregation
    if (!lowerQuery.includes('limit') && 
        !lowerQuery.includes('count(') && 
        !lowerQuery.includes('sum(') && 
        !lowerQuery.includes('avg(') &&
        !options.skipAutoLimit) {
      optimizedQuery += ' LIMIT 1000';
      wasOptimized = true;
    }

    // Replace SELECT * with specific columns when possible
    if (lowerQuery.includes('select *') && options.selectColumns) {
      optimizedQuery = optimizedQuery.replace(
        /select\s+\*/i, 
        `SELECT ${options.selectColumns.join(', ')}`
      );
      wasOptimized = true;
    }

    return {
      optimized: wasOptimized,
      query: optimizedQuery,
      params
    };
  }

  /**
   * Optimize JOIN queries
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Options
   * @returns {Object} Optimization result
   */
  async optimizeJoinQueries(query, params, options) {
    const lowerQuery = query.toLowerCase();
    
    if (!lowerQuery.includes('join')) {
      return { optimized: false };
    }

    let optimizedQuery = query;
    let wasOptimized = false;

    // Convert CROSS JOINs to INNER JOINs when possible
    if (lowerQuery.includes('cross join')) {
      // This is a complex optimization that would require query parsing
      // For now, just log a warning
      logger.warn('CROSS JOIN detected, consider converting to INNER JOIN', {
        query: query.substring(0, 100)
      });
    }

    // Suggest index usage for JOIN conditions
    const joinMatches = query.match(/join\s+(\w+)\s+on\s+([^where]+)/gi);
    if (joinMatches) {
      joinMatches.forEach(match => {
        logger.debug('JOIN condition found, ensure proper indexing:', {
          joinCondition: match.substring(0, 100)
        });
      });
    }

    return {
      optimized: wasOptimized,
      query: optimizedQuery,
      params
    };
  }

  /**
   * Optimize WHERE clauses
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Options
   * @returns {Object} Optimization result
   */
  async optimizeWhereClause(query, params, options) {
    const lowerQuery = query.toLowerCase();
    
    if (!lowerQuery.includes('where')) {
      return { optimized: false };
    }

    let optimizedQuery = query;
    let wasOptimized = false;

    // Detect potentially inefficient patterns
    const inefficientPatterns = [
      { pattern: /where\s+(\w+)\s+like\s+'%[^%]+'/i, message: 'Leading wildcard LIKE can be slow' },
      { pattern: /where\s+function\s*\(/i, message: 'Functions in WHERE clause prevent index usage' },
      { pattern: /where\s+(\w+)\s*\+\s*(\w+|\d+)/i, message: 'Arithmetic in WHERE clause prevents index usage' }
    ];

    inefficientPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(query)) {
        logger.warn('Query optimization warning:', {
          message,
          query: query.substring(0, 100)
        });
      }
    });

    return {
      optimized: wasOptimized,
      query: optimizedQuery,
      params
    };
  }

  /**
   * Optimize ORDER BY clauses
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Options
   * @returns {Object} Optimization result
   */
  async optimizeOrderBy(query, params, options) {
    const lowerQuery = query.toLowerCase();
    
    if (!lowerQuery.includes('order by')) {
      return { optimized: false };
    }

    // Warn about ORDER BY without LIMIT
    if (!lowerQuery.includes('limit')) {
      logger.warn('ORDER BY without LIMIT detected, consider adding LIMIT', {
        query: query.substring(0, 100)
      });
    }

    return { optimized: false };
  }

  /**
   * Optimize pagination queries
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Options
   * @returns {Object} Optimization result
   */
  async optimizePagination(query, params, options) {
    const lowerQuery = query.toLowerCase();
    
    if (!lowerQuery.includes('offset') && !lowerQuery.includes('limit')) {
      return { optimized: false };
    }

    let wasOptimized = false;

    // Warn about large OFFSET values
    const offsetMatch = query.match(/offset\s+(\d+)/i);
    if (offsetMatch) {
      const offsetValue = parseInt(offsetMatch[1]);
      if (offsetValue > 10000) {
        logger.warn('Large OFFSET detected, consider cursor-based pagination', {
          offset: offsetValue,
          query: query.substring(0, 100)
        });
      }
    }

    return { optimized: wasOptimized };
  }

  /**
   * Generate cache key for query and parameters
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {string} Cache key
   */
  generateQueryCacheKey(query, params) {
    const crypto = require('crypto');
    const queryHash = crypto
      .createHash('sha256')
      .update(query + JSON.stringify(params))
      .digest('hex')
      .substring(0, 16);
    return `query_${queryHash}`;
  }

  /**
   * Cache query result
   * @param {string} key - Cache key
   * @param {any} data - Query result
   * @param {number} ttl - Time to live in ms
   */
  cacheQueryResult(key, data, ttl) {
    if (this.queryCache.size >= this.config.queryCache.maxSize) {
      this.cleanupQueryCache();
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Check if cache entry is valid
   * @param {Object} entry - Cache entry
   * @returns {boolean} Is valid
   */
  isCacheEntryValid(entry) {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupQueryCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.queryCache) {
      if (now - entry.timestamp >= entry.ttl) {
        this.queryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired query cache entries`);
    }
  }

  /**
   * Start periodic cache cleanup
   */
  startQueryCacheCleanup() {
    setInterval(() => {
      this.cleanupQueryCache();
    }, 60000); // Every minute
  }

  /**
   * Create timeout promise
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} executionId - Execution ID
   * @returns {Promise} Timeout promise
   */
  createTimeoutPromise(timeoutMs, executionId) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms (${executionId})`));
      }, timeoutMs);
    });
  }

  /**
   * Get query optimization statistics
   * @returns {Object} Optimization statistics
   */
  getOptimizationStats() {
    return {
      ...this.queryStats,
      cacheSize: this.queryCache.size,
      optimizationRate: this.queryStats.executed > 0 
        ? (this.queryStats.optimized / this.queryStats.executed) * 100 
        : 0,
      cacheHitRate: this.queryStats.executed > 0 
        ? (this.queryStats.cached / this.queryStats.executed) * 100 
        : 0
    };
  }

  /**
   * Clear optimization statistics
   */
  clearStats() {
    this.queryStats = {
      executed: 0,
      optimized: 0,
      cached: 0,
      slowQueries: 0
    };
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
    logger.info('Query cache cleared');
  }

  /**
   * Get database health metrics
   * @returns {Object} Health metrics
   */
  getHealthMetrics() {
    return {
      queryCache: {
        size: this.queryCache.size,
        maxSize: this.config.queryCache.maxSize,
        utilizationPercentage: (this.queryCache.size / this.config.queryCache.maxSize) * 100
      },
      optimization: this.getOptimizationStats(),
      config: {
        queryTimeout: this.config.queryTimeout,
        slowQueryThreshold: this.config.slowQueryThreshold,
        maxConnections: this.config.maxConnections
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export default new DatabaseOptimizationService();