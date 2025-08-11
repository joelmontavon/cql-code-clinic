import Redis from 'redis';
import winston from 'winston';
import crypto from 'crypto';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Cache Service for Performance Optimization
 * Provides multi-level caching with Redis and in-memory fallback
 */
export class CacheService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };
    
    // Cache configuration
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryAttempts: 3,
        retryDelay: 1000
      },
      memory: {
        maxSize: 1000, // Maximum number of items in memory cache
        ttl: 300 // 5 minutes default TTL for memory cache
      },
      defaultTTL: 3600 // 1 hour default TTL
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback to memory cache
   */
  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        socket: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          reconnectStrategy: (retries) => {
            if (retries > this.config.redis.retryAttempts) {
              logger.warn('Redis max retries exceeded, falling back to memory cache');
              return false;
            }
            return this.config.redis.retryDelay * retries;
          }
        },
        password: this.config.redis.password
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis connection error:', err);
        this.cacheStats.errors++;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis cache connected successfully');
      });

      this.redisClient.on('ready', () => {
        logger.info('Redis cache ready for operations');
      });

      await this.redisClient.connect();

    } catch (error) {
      logger.warn('Failed to initialize Redis, using memory cache only:', error);
      this.redisClient = null;
    }
  }

  /**
   * Generate cache key with namespace and optional hash
   * @param {string} namespace - Cache namespace
   * @param {string|Object} key - Cache key or object to hash
   * @param {Object} options - Additional options
   * @returns {string} Generated cache key
   */
  generateKey(namespace, key, options = {}) {
    const { prefix = 'cql_clinic', version = '1.0' } = options;
    
    let keyString;
    if (typeof key === 'object') {
      keyString = crypto.createHash('sha256')
        .update(JSON.stringify(key))
        .digest('hex')
        .substring(0, 16);
    } else {
      keyString = String(key);
    }

    return `${prefix}:${version}:${namespace}:${keyString}`;
  }

  /**
   * Get value from cache (Redis first, then memory fallback)
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {Promise<any>} Cached value or null
   */
  async get(key, options = {}) {
    this.cacheStats.operations++;

    try {
      // Try Redis first
      if (this.redisClient && this.redisClient.isReady) {
        const value = await this.redisClient.get(key);
        if (value !== null) {
          this.cacheStats.hits++;
          return JSON.parse(value);
        }
      }

      // Fallback to memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && this.isNotExpired(memoryItem)) {
        this.cacheStats.hits++;
        return memoryItem.value;
      } else if (memoryItem) {
        // Remove expired item
        this.memoryCache.delete(key);
      }

      this.cacheStats.misses++;
      return null;

    } catch (error) {
      logger.error('Cache get error:', error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache (Redis and memory)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.config.defaultTTL) {
    this.cacheStats.operations++;

    try {
      const serializedValue = JSON.stringify(value);

      // Set in Redis if available
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.setEx(key, ttl, serializedValue);
      }

      // Set in memory cache as backup
      this.setMemoryCache(key, value, ttl);

      return true;

    } catch (error) {
      logger.error('Cache set error:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    this.cacheStats.operations++;

    try {
      // Delete from Redis
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.del(key);
      }

      // Delete from memory cache
      this.memoryCache.delete(key);

      return true;

    } catch (error) {
      logger.error('Cache delete error:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Redis pattern (e.g., "user:*")
   * @returns {Promise<number>} Number of keys deleted
   */
  async deletePattern(pattern) {
    this.cacheStats.operations++;

    try {
      let deletedCount = 0;

      // Delete from Redis using pattern
      if (this.redisClient && this.redisClient.isReady) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await this.redisClient.del(keys);
        }
      }

      // Delete from memory cache (simple string matching)
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const [key] of this.memoryCache) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }

      return deletedCount;

    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * Increment counter in cache
   * @param {string} key - Cache key
   * @param {number} increment - Increment value
   * @param {number} ttl - Time to live
   * @returns {Promise<number>} New value
   */
  async increment(key, increment = 1, ttl = this.config.defaultTTL) {
    this.cacheStats.operations++;

    try {
      let newValue = increment;

      if (this.redisClient && this.redisClient.isReady) {
        newValue = await this.redisClient.incrBy(key, increment);
        await this.redisClient.expire(key, ttl);
      } else {
        // Memory cache fallback
        const current = await this.get(key);
        newValue = (current || 0) + increment;
        await this.set(key, newValue, ttl);
      }

      return newValue;

    } catch (error) {
      logger.error('Cache increment error:', error);
      this.cacheStats.errors++;
      return increment;
    }
  }

  /**
   * Get or set pattern - return cached value or execute function and cache result
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to execute if cache miss
   * @param {number} ttl - Time to live
   * @returns {Promise<any>} Cached or computed value
   */
  async getOrSet(key, fetchFunction, ttl = this.config.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await fetchFunction();
      await this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error('Cache getOrSet fetch error:', error);
      throw error;
    }
  }

  /**
   * Cache CQL execution results
   * @param {string} code - CQL code
   * @param {Object} context - Execution context
   * @param {Object} result - Execution result
   * @param {number} ttl - Cache TTL
   * @returns {Promise<boolean>} Success status
   */
  async cacheCQLResult(code, context, result, ttl = 1800) { // 30 minutes
    const key = this.generateKey('cql_execution', { code, context });
    return await this.set(key, result, ttl);
  }

  /**
   * Get cached CQL execution result
   * @param {string} code - CQL code
   * @param {Object} context - Execution context
   * @returns {Promise<Object|null>} Cached result or null
   */
  async getCachedCQLResult(code, context) {
    const key = this.generateKey('cql_execution', { code, context });
    return await this.get(key);
  }

  /**
   * Cache exercise data
   * @param {string} exerciseId - Exercise ID
   * @param {Object} exerciseData - Exercise data
   * @param {number} ttl - Cache TTL
   * @returns {Promise<boolean>} Success status
   */
  async cacheExercise(exerciseId, exerciseData, ttl = 3600) { // 1 hour
    const key = this.generateKey('exercise', exerciseId);
    return await this.set(key, exerciseData, ttl);
  }

  /**
   * Get cached exercise data
   * @param {string} exerciseId - Exercise ID
   * @returns {Promise<Object|null>} Cached exercise or null
   */
  async getCachedExercise(exerciseId) {
    const key = this.generateKey('exercise', exerciseId);
    return await this.get(key);
  }

  /**
   * Cache user progress data
   * @param {string} userId - User ID
   * @param {Object} progressData - Progress data
   * @param {number} ttl - Cache TTL
   * @returns {Promise<boolean>} Success status
   */
  async cacheUserProgress(userId, progressData, ttl = 300) { // 5 minutes
    const key = this.generateKey('user_progress', userId);
    return await this.set(key, progressData, ttl);
  }

  /**
   * Get cached user progress
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Cached progress or null
   */
  async getCachedUserProgress(userId) {
    const key = this.generateKey('user_progress', userId);
    return await this.get(key);
  }

  /**
   * Cache user session data
   * @param {string} sessionId - Session ID
   * @param {Object} sessionData - Session data
   * @param {number} ttl - Cache TTL
   * @returns {Promise<boolean>} Success status
   */
  async cacheUserSession(sessionId, sessionData, ttl = 1800) { // 30 minutes
    const key = this.generateKey('user_session', sessionId);
    return await this.set(key, sessionData, ttl);
  }

  /**
   * Invalidate user-related caches
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async invalidateUserCache(userId) {
    await Promise.all([
      this.deletePattern(`*user_progress:${userId}*`),
      this.deletePattern(`*user_session:${userId}*`),
      this.deletePattern(`*user_analytics:${userId}*`)
    ]);
  }

  /**
   * Invalidate exercise-related caches
   * @param {string} exerciseId - Exercise ID
   * @returns {Promise<void>}
   */
  async invalidateExerciseCache(exerciseId) {
    await Promise.all([
      this.deletePattern(`*exercise:${exerciseId}*`),
      this.deletePattern(`*cql_execution:*${exerciseId}*`)
    ]);
  }

  /**
   * Set item in memory cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Cache value
   * @param {number} ttl - Time to live in seconds
   */
  setMemoryCache(key, value, ttl) {
    // Clean up expired items periodically
    if (this.memoryCache.size > this.config.memory.maxSize) {
      this.cleanupMemoryCache();
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + (ttl * 1000)
    });
  }

  /**
   * Check if memory cache item is not expired
   * @param {Object} item - Cache item
   * @returns {boolean} Not expired status
   */
  isNotExpired(item) {
    return Date.now() < item.expiresAt;
  }

  /**
   * Clean up expired items from memory cache
   */
  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, item] of this.memoryCache) {
      if (now >= item.expiresAt) {
        this.memoryCache.delete(key);
      }
    }

    // If still too large, remove oldest items
    if (this.memoryCache.size > this.config.memory.maxSize) {
      const entries = Array.from(this.memoryCache.entries());
      const toDelete = entries.slice(0, entries.length - this.config.memory.maxSize);
      toDelete.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.cacheStats.operations > 0 ? 
      (this.cacheStats.hits / this.cacheStats.operations) * 100 : 0;

    return {
      ...this.cacheStats,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redisClient?.isReady || false
    };
  }

  /**
   * Clear all cache statistics
   */
  clearStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };
  }

  /**
   * Flush all caches
   * @returns {Promise<boolean>} Success status
   */
  async flush() {
    try {
      // Flush Redis
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.flushDb();
      }

      // Clear memory cache
      this.memoryCache.clear();

      logger.info('All caches flushed successfully');
      return true;

    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Close cache connections
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      this.memoryCache.clear();
      logger.info('Cache service closed successfully');
    } catch (error) {
      logger.error('Cache close error:', error);
    }
  }

  /**
   * Health check for cache service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const health = {
      redis: false,
      memory: true,
      overall: false,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };

    try {
      // Check Redis connection
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      logger.warn('Redis health check failed:', error);
    }

    health.overall = health.redis || health.memory;
    return health;
  }
}

// Export singleton instance
export default new CacheService();