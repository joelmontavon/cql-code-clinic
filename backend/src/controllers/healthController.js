import { cqlService } from '../services/cqlService.js';
import { sendSuccess } from '../utils/response.js';
import logger from '../config/logger.js';
import env from '../config/env.js';

export class HealthController {
  /**
   * Health check endpoint
   * GET /api/health
   */
  async healthCheck(req, res, next) {
    try {
      const requestId = res.locals.requestId;
      const startTime = process.hrtime();

      logger.debug('Health check request', { requestId });

      // Check CQL service health
      const cqlServiceHealth = await cqlService.healthCheck();

      // Get system information
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Calculate response time
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

      const healthData = {
        status: cqlServiceHealth.status === 'ok' ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        version: process.env.npm_package_version || '1.0.0',
        environment: env.NODE_ENV,
        services: {
          cqlExecutionService: {
            status: cqlServiceHealth.status,
            url: env.CQL_EXECUTION_SERVICE_URL,
            responseTime: cqlServiceHealth.responseTime
          }
        },
        system: {
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          },
          cpu: {
            usage: process.cpuUsage().user / 1000000 // Convert microseconds to seconds
          }
        }
      };

      logger.info('Health check completed', {
        requestId,
        status: healthData.status,
        responseTime: Math.round(responseTime),
        cqlServiceStatus: cqlServiceHealth.status,
        cqlServiceResponseTime: cqlServiceHealth.responseTime,
        memoryUsage: `${healthData.system.memory.used}MB/${healthData.system.memory.total}MB (${healthData.system.memory.percentage}%)`
      });

      // Set appropriate HTTP status based on health
      const httpStatus = healthData.status === 'ok' ? 200 : 503;

      sendSuccess(res, healthData, 'Health check completed', httpStatus);
    } catch (error) {
      logger.error('Health check failed', {
        requestId: res.locals.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Even if health check fails, we want to return some information
      const errorHealthData = {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version || '1.0.0',
        environment: env.NODE_ENV,
        services: {
          cqlExecutionService: {
            status: 'error',
            url: env.CQL_EXECUTION_SERVICE_URL
          }
        },
        system: {
          memory: {
            used: 0,
            total: 0,
            percentage: 0
          },
          cpu: {
            usage: 0
          }
        }
      };

      sendSuccess(res, errorHealthData, 'Health check completed with errors', 503);
    }
  }

  /**
   * Simple liveness probe
   * GET /api/health/live
   */
  async liveness(req, res) {
    const requestId = res.locals.requestId;

    logger.debug('Liveness probe', { requestId });

    sendSuccess(res, {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    }, 'Service is alive');
  }

  /**
   * Readiness probe
   * GET /api/health/ready
   */
  async readiness(req, res) {
    const requestId = res.locals.requestId;

    logger.debug('Readiness probe', { requestId });

    try {
      // Quick check of essential services
      const cqlServiceHealth = await cqlService.healthCheck();
      
      const isReady = cqlServiceHealth.status === 'ok';

      sendSuccess(res, {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        services: {
          cqlExecutionService: cqlServiceHealth.status
        }
      }, isReady ? 'Service is ready' : 'Service is not ready', isReady ? 200 : 503);
    } catch (error) {
      logger.warn('Readiness check failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      sendSuccess(res, {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Service dependency check failed'
      }, 'Service is not ready', 503);
    }
  }
}

export const healthController = new HealthController();