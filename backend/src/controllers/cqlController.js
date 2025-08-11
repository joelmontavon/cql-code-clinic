import { cqlService } from '../services/cqlService.js';
import { sendSuccess, sendError, HttpStatusCode, ErrorType } from '../utils/response.js';
import logger from '../config/logger.js';

export class CQLController {
  /**
   * Execute CQL code
   * POST /api/cql/execute
   */
  async executeCQL(req, res, next) {
    try {
      const requestData = req.body;
      const requestId = res.locals.requestId;

      logger.info('CQL execution request received', {
        requestId,
        codeLength: requestData.code.length,
        hasParameters: Boolean(requestData.parameters?.length),
        patientId: requestData.patientId
      });

      // Execute CQL through service
      const result = await cqlService.executeCQL(requestData);

      // Check if there are any execution errors in the result
      const hasErrors = result.some(item => item.error || item['translator-error']);
      
      if (hasErrors) {
        logger.warn('CQL execution completed with errors', {
          requestId,
          resultsCount: result.length,
          errors: result
            .filter(item => item.error || item['translator-error'])
            .map(item => item.error || item['translator-error'])
        });
      } else {
        logger.info('CQL execution completed successfully', {
          requestId,
          resultsCount: result.length
        });
      }

      sendSuccess(res, result, 'CQL execution completed');
    } catch (error) {
      logger.error('CQL execution failed', {
        requestId: res.locals.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        codePreview: req.body?.code?.substring(0, 100)
      });

      // Determine appropriate error response based on error type
      if (error instanceof Error) {
        if (error.message.includes('not available')) {
          sendError(
            res,
            ErrorType.CQL_SERVICE_UNAVAILABLE,
            'CQL execution service is currently unavailable',
            HttpStatusCode.SERVICE_UNAVAILABLE
          );
        } else if (error.message.includes('timeout')) {
          sendError(
            res,
            ErrorType.CQL_EXECUTION_ERROR,
            'CQL execution timed out',
            HttpStatusCode.GATEWAY_TIMEOUT
          );
        } else if (error.message.includes('Invalid request') || error.message.includes('Validation')) {
          sendError(
            res,
            ErrorType.VALIDATION_ERROR,
            error.message,
            HttpStatusCode.BAD_REQUEST
          );
        } else {
          sendError(
            res,
            ErrorType.CQL_EXECUTION_ERROR,
            error.message,
            HttpStatusCode.BAD_GATEWAY
          );
        }
      } else {
        next(error);
      }
    }
  }

  /**
   * Format CQL code
   * POST /api/cql/format
   */
  async formatCQL(req, res, next) {
    try {
      const requestData = req.body;
      const requestId = res.locals.requestId;

      logger.info('CQL format request received', {
        requestId,
        codeLength: requestData.code.length
      });

      // Format CQL through service
      const result = await cqlService.formatCQL(requestData);

      logger.info('CQL formatting completed successfully', {
        requestId,
        originalLength: requestData.code.length,
        formattedLength: result['formatted-cql'].length
      });

      sendSuccess(res, result, 'CQL formatting completed');
    } catch (error) {
      logger.error('CQL formatting failed', {
        requestId: res.locals.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        codePreview: req.body?.code?.substring(0, 100)
      });

      if (error instanceof Error) {
        sendError(
          res,
          ErrorType.CQL_EXECUTION_ERROR,
          error.message,
          HttpStatusCode.BAD_GATEWAY
        );
      } else {
        next(error);
      }
    }
  }

  /**
   * Get CQL service status
   * GET /api/cql/status
   */
  async getServiceStatus(req, res, next) {
    try {
      const requestId = res.locals.requestId;

      logger.debug('CQL service status request', { requestId });

      const healthCheck = await cqlService.healthCheck();
      const serviceInfo = cqlService.getServiceInfo();

      const statusData = {
        service: 'CQL Execution Service',
        status: healthCheck.status,
        url: serviceInfo.baseURL,
        responseTime: healthCheck.responseTime,
        timeout: serviceInfo.timeout,
        timestamp: new Date().toISOString()
      };

      logger.info('CQL service status retrieved', {
        requestId,
        status: healthCheck.status,
        responseTime: healthCheck.responseTime
      });

      sendSuccess(res, statusData, 'CQL service status retrieved');
    } catch (error) {
      logger.error('Failed to get CQL service status', {
        requestId: res.locals.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(error);
    }
  }
}

export const cqlController = new CQLController();