import winston from 'winston';
import cacheService from './cacheService.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Performance Monitoring Service
 * Tracks and analyzes application performance metrics
 */
export class PerformanceService {
  constructor() {
    this.metrics = {
      requests: new Map(),
      responses: new Map(),
      database: new Map(),
      cache: new Map(),
      cql: new Map(),
      errors: new Map()
    };

    this.config = {
      sampleRate: parseFloat(process.env.PERF_SAMPLE_RATE) || 1.0, // 100% sampling by default
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_MS) || 2000, // 2 seconds
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_MS) || 1000, // 1 second
      metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      aggregationInterval: 60 * 1000, // 1 minute
      alertThresholds: {
        errorRate: 0.05, // 5% error rate threshold
        avgResponseTime: 3000, // 3 second average response time
        p95ResponseTime: 5000, // 5 second 95th percentile
        dbConnectionPool: 0.8 // 80% database connection pool usage
      }
    };

    this.startAggregation();
  }

  /**
   * Generate performance tracking ID
   * @returns {string} Unique tracking ID
   */
  generateTrackingId() {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start request tracking
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} metadata - Additional metadata
   * @returns {string} Tracking ID
   */
  startRequest(method, url, metadata = {}) {
    if (!this.shouldSample()) return null;

    const trackingId = this.generateTrackingId();
    const startTime = process.hrtime.bigint();

    this.metrics.requests.set(trackingId, {
      method,
      url,
      startTime,
      metadata,
      timestamp: Date.now()
    });

    return trackingId;
  }

  /**
   * End request tracking
   * @param {string} trackingId - Tracking ID
   * @param {number} statusCode - HTTP status code
   * @param {Object} metadata - Additional metadata
   */
  endRequest(trackingId, statusCode, metadata = {}) {
    if (!trackingId) return;

    const request = this.metrics.requests.get(trackingId);
    if (!request) return;

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - request.startTime) / 1e6; // Convert to milliseconds

    const responseMetric = {
      method: request.method,
      url: request.url,
      statusCode,
      duration,
      timestamp: Date.now(),
      metadata: { ...request.metadata, ...metadata }
    };

    this.metrics.responses.set(trackingId, responseMetric);
    this.metrics.requests.delete(trackingId);

    // Log slow requests
    if (duration > this.config.slowRequestThreshold) {
      logger.warn('Slow request detected', {
        method: request.method,
        url: request.url,
        duration,
        statusCode
      });
    }

    // Log error responses
    if (statusCode >= 400) {
      this.trackError(trackingId, 'http_error', {
        statusCode,
        method: request.method,
        url: request.url,
        duration
      });
    }
  }

  /**
   * Track database operation
   * @param {string} operation - Database operation type
   * @param {string} query - Database query
   * @param {number} duration - Operation duration in ms
   * @param {Object} metadata - Additional metadata
   */
  trackDatabase(operation, query, duration, metadata = {}) {
    if (!this.shouldSample()) return;

    const trackingId = this.generateTrackingId();

    this.metrics.database.set(trackingId, {
      operation,
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: Date.now(),
      metadata
    });

    // Log slow queries
    if (duration > this.config.slowQueryThreshold) {
      logger.warn('Slow database query detected', {
        operation,
        query: query.substring(0, 100),
        duration
      });
    }
  }

  /**
   * Track cache operation
   * @param {string} operation - Cache operation (get, set, delete)
   * @param {string} key - Cache key
   * @param {boolean} hit - Cache hit status
   * @param {number} duration - Operation duration in ms
   */
  trackCache(operation, key, hit, duration) {
    if (!this.shouldSample()) return;

    const trackingId = this.generateTrackingId();

    this.metrics.cache.set(trackingId, {
      operation,
      key,
      hit,
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * Track CQL execution
   * @param {string} code - CQL code
   * @param {boolean} success - Execution success
   * @param {number} duration - Execution duration in ms
   * @param {Object} metadata - Additional metadata
   */
  trackCQLExecution(code, success, duration, metadata = {}) {
    if (!this.shouldSample()) return;

    const trackingId = this.generateTrackingId();

    this.metrics.cql.set(trackingId, {
      codeLength: code.length,
      success,
      duration,
      timestamp: Date.now(),
      metadata
    });

    // Log slow CQL executions
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow CQL execution detected', {
        codeLength: code.length,
        duration,
        success
      });
    }
  }

  /**
   * Track error occurrence
   * @param {string} trackingId - Optional tracking ID
   * @param {string} errorType - Error type
   * @param {Object} errorData - Error details
   */
  trackError(trackingId, errorType, errorData = {}) {
    const errorId = trackingId || this.generateTrackingId();

    this.metrics.errors.set(errorId, {
      type: errorType,
      data: errorData,
      timestamp: Date.now(),
      stackTrace: errorData.stack ? errorData.stack.split('\n').slice(0, 10) : null
    });

    logger.error('Performance error tracked', {
      errorId,
      type: errorType,
      data: errorData
    });
  }

  /**
   * Get real-time performance metrics
   * @param {string} timeWindow - Time window (1m, 5m, 15m, 1h)
   * @returns {Object} Performance metrics
   */
  getMetrics(timeWindow = '5m') {
    const windowMs = this.parseTimeWindow(timeWindow);
    const cutoffTime = Date.now() - windowMs;

    const metrics = {
      requests: this.aggregateResponses(cutoffTime),
      database: this.aggregateDatabase(cutoffTime),
      cache: this.aggregateCache(cutoffTime),
      cql: this.aggregateCQL(cutoffTime),
      errors: this.aggregateErrors(cutoffTime),
      system: this.getSystemMetrics(),
      timestamp: Date.now(),
      timeWindow
    };

    return metrics;
  }

  /**
   * Aggregate response metrics
   * @param {number} cutoffTime - Cutoff timestamp
   * @returns {Object} Aggregated response metrics
   */
  aggregateResponses(cutoffTime) {
    const responses = Array.from(this.metrics.responses.values())
      .filter(r => r.timestamp >= cutoffTime);

    if (responses.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0,
        statusCodes: {},
        slowRequests: 0
      };
    }

    const durations = responses.map(r => r.duration).sort((a, b) => a - b);
    const statusCodes = {};
    let errorCount = 0;
    let slowRequestCount = 0;

    responses.forEach(r => {
      statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
      if (r.statusCode >= 400) errorCount++;
      if (r.duration > this.config.slowRequestThreshold) slowRequestCount++;
    });

    return {
      count: responses.length,
      avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      p50Duration: Math.round(durations[Math.floor(durations.length * 0.5)]),
      p95Duration: Math.round(durations[Math.floor(durations.length * 0.95)]),
      p99Duration: Math.round(durations[Math.floor(durations.length * 0.99)]),
      errorRate: Math.round((errorCount / responses.length) * 100) / 100,
      statusCodes,
      slowRequests: slowRequestCount
    };
  }

  /**
   * Aggregate database metrics
   * @param {number} cutoffTime - Cutoff timestamp
   * @returns {Object} Aggregated database metrics
   */
  aggregateDatabase(cutoffTime) {
    const operations = Array.from(this.metrics.database.values())
      .filter(op => op.timestamp >= cutoffTime);

    if (operations.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        slowQueries: 0,
        operations: {}
      };
    }

    const durations = operations.map(op => op.duration);
    const operationTypes = {};
    let slowQueryCount = 0;

    operations.forEach(op => {
      operationTypes[op.operation] = (operationTypes[op.operation] || 0) + 1;
      if (op.duration > this.config.slowQueryThreshold) slowQueryCount++;
    });

    return {
      count: operations.length,
      avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      slowQueries: slowQueryCount,
      operations: operationTypes
    };
  }

  /**
   * Aggregate cache metrics
   * @param {number} cutoffTime - Cutoff timestamp
   * @returns {Object} Aggregated cache metrics
   */
  aggregateCache(cutoffTime) {
    const operations = Array.from(this.metrics.cache.values())
      .filter(op => op.timestamp >= cutoffTime);

    if (operations.length === 0) {
      return {
        count: 0,
        hitRate: 0,
        avgDuration: 0,
        operations: {}
      };
    }

    const hits = operations.filter(op => op.hit).length;
    const durations = operations.map(op => op.duration);
    const operationTypes = {};

    operations.forEach(op => {
      operationTypes[op.operation] = (operationTypes[op.operation] || 0) + 1;
    });

    return {
      count: operations.length,
      hitRate: Math.round((hits / operations.length) * 100) / 100,
      avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      operations: operationTypes
    };
  }

  /**
   * Aggregate CQL execution metrics
   * @param {number} cutoffTime - Cutoff timestamp
   * @returns {Object} Aggregated CQL metrics
   */
  aggregateCQL(cutoffTime) {
    const executions = Array.from(this.metrics.cql.values())
      .filter(ex => ex.timestamp >= cutoffTime);

    if (executions.length === 0) {
      return {
        count: 0,
        successRate: 0,
        avgDuration: 0,
        slowExecutions: 0
      };
    }

    const successful = executions.filter(ex => ex.success).length;
    const durations = executions.map(ex => ex.duration);
    const slowExecutions = executions.filter(ex => ex.duration > 5000).length;

    return {
      count: executions.length,
      successRate: Math.round((successful / executions.length) * 100) / 100,
      avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      slowExecutions
    };
  }

  /**
   * Aggregate error metrics
   * @param {number} cutoffTime - Cutoff timestamp
   * @returns {Object} Aggregated error metrics
   */
  aggregateErrors(cutoffTime) {
    const errors = Array.from(this.metrics.errors.values())
      .filter(err => err.timestamp >= cutoffTime);

    const errorTypes = {};
    errors.forEach(err => {
      errorTypes[err.type] = (errorTypes[err.type] || 0) + 1;
    });

    return {
      count: errors.length,
      types: errorTypes,
      recent: errors.slice(-10).map(err => ({
        type: err.type,
        timestamp: err.timestamp,
        data: err.data
      }))
    };
  }

  /**
   * Get system metrics
   * @returns {Object} System metrics
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version
    };
  }

  /**
   * Check if request should be sampled
   * @returns {boolean} Should sample
   */
  shouldSample() {
    return Math.random() <= this.config.sampleRate;
  }

  /**
   * Parse time window string to milliseconds
   * @param {string} timeWindow - Time window string
   * @returns {number} Milliseconds
   */
  parseTimeWindow(timeWindow) {
    const matches = timeWindow.match(/^(\d+)([smh])$/);
    if (!matches) return 5 * 60 * 1000; // Default 5 minutes

    const [, value, unit] = matches;
    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 };
    return parseInt(value) * multipliers[unit];
  }

  /**
   * Start periodic metric aggregation and cleanup
   */
  startAggregation() {
    // Clean up old metrics every minute
    setInterval(() => {
      this.cleanupMetrics();
    }, this.config.aggregationInterval);

    // Cache performance metrics every 30 seconds
    setInterval(async () => {
      const metrics = this.getMetrics('5m');
      await cacheService.set('performance_metrics', metrics, 60);
    }, 30 * 1000);

    logger.info('Performance monitoring aggregation started');
  }

  /**
   * Clean up old metrics beyond retention period
   */
  cleanupMetrics() {
    const cutoffTime = Date.now() - this.config.metricsRetentionPeriod;
    let cleanedCount = 0;

    // Clean up each metric type
    [this.metrics.responses, this.metrics.database, this.metrics.cache, 
     this.metrics.cql, this.metrics.errors].forEach(metricMap => {
      for (const [key, value] of metricMap) {
        if (value.timestamp < cutoffTime) {
          metricMap.delete(key);
          cleanedCount++;
        }
      }
    });

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} old performance metrics`);
    }
  }

  /**
   * Check performance alerts
   * @returns {Array} Active alerts
   */
  checkAlerts() {
    const metrics = this.getMetrics('5m');
    const alerts = [];

    // Error rate alert
    if (metrics.requests.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'warning',
        message: `High error rate: ${metrics.requests.errorRate}%`,
        value: metrics.requests.errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }

    // Average response time alert
    if (metrics.requests.avgDuration > this.config.alertThresholds.avgResponseTime) {
      alerts.push({
        type: 'avg_response_time',
        severity: 'warning',
        message: `High average response time: ${metrics.requests.avgDuration}ms`,
        value: metrics.requests.avgDuration,
        threshold: this.config.alertThresholds.avgResponseTime
      });
    }

    // P95 response time alert
    if (metrics.requests.p95Duration > this.config.alertThresholds.p95ResponseTime) {
      alerts.push({
        type: 'p95_response_time',
        severity: 'critical',
        message: `High P95 response time: ${metrics.requests.p95Duration}ms`,
        value: metrics.requests.p95Duration,
        threshold: this.config.alertThresholds.p95ResponseTime
      });
    }

    return alerts;
  }

  /**
   * Get performance health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics('1m');
    const alerts = this.checkAlerts();
    
    let status = 'healthy';
    if (alerts.some(alert => alert.severity === 'critical')) {
      status = 'critical';
    } else if (alerts.some(alert => alert.severity === 'warning')) {
      status = 'warning';
    }

    return {
      status,
      alerts,
      summary: {
        requestCount: metrics.requests.count,
        errorRate: metrics.requests.errorRate,
        avgResponseTime: metrics.requests.avgDuration,
        p95ResponseTime: metrics.requests.p95Duration,
        cacheHitRate: metrics.cache.hitRate
      },
      timestamp: Date.now()
    };
  }

  /**
   * Export performance data for analysis
   * @param {string} timeWindow - Time window
   * @returns {Object} Exported performance data
   */
  exportData(timeWindow = '1h') {
    const windowMs = this.parseTimeWindow(timeWindow);
    const cutoffTime = Date.now() - windowMs;

    const data = {
      requests: Array.from(this.metrics.responses.values())
        .filter(r => r.timestamp >= cutoffTime),
      database: Array.from(this.metrics.database.values())
        .filter(d => d.timestamp >= cutoffTime),
      cache: Array.from(this.metrics.cache.values())
        .filter(c => c.timestamp >= cutoffTime),
      cql: Array.from(this.metrics.cql.values())
        .filter(c => c.timestamp >= cutoffTime),
      errors: Array.from(this.metrics.errors.values())
        .filter(e => e.timestamp >= cutoffTime),
      exportTime: Date.now(),
      timeWindow
    };

    return data;
  }

  /**
   * Reset all performance metrics
   */
  reset() {
    Object.values(this.metrics).forEach(metricMap => metricMap.clear());
    logger.info('Performance metrics reset');
  }
}

export default new PerformanceService();