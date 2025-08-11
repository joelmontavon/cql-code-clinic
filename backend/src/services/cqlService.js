import axios from 'axios';
import env from '../config/env.js';
import logger from '../config/logger.js';

export class CQLService {
  constructor() {
    this.baseURL = env.CQL_EXECUTION_SERVICE_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: env.CQL_REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CQL-Code-Clinic-Backend/1.0.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('CQL Service Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          timeout: config.timeout
        });
        return config;
      },
      (error) => {
        logger.error('CQL Service Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('CQL Service Response', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          responseTime: response.headers['x-response-time']
        });
        return response;
      },
      (error) => {
        logger.error('CQL Service Response Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
          code: error.code
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute CQL code
   */
  async executeCQL(request) {
    try {
      logger.info('Executing CQL code', {
        codeLength: request.code.length,
        hasParameters: Boolean(request.parameters?.length),
        patientId: request.patientId
      });

      // For development: return mock response if CQL service is not available
      if (env.NODE_ENV === 'development') {
        try {
          // Try to connect to the actual service first
          const response = await this.client.post('/cql/evaluate', {
            code: request.code,
            terminologyServiceUri: request.terminologyServiceUri || `${this.baseURL}/baseR4`,
            dataServiceUri: request.dataServiceUri || `${this.baseURL}/baseR4`,
            patientId: request.patientId || 'example-patient-id',
            parameters: request.parameters || []
          });

          logger.info('CQL execution completed successfully', {
            resultsCount: response.data.length,
            hasErrors: response.data.some(result => result.error || result['translator-error'])
          });

          return response.data;
        } catch (connectionError) {
          logger.warn('CQL service unavailable, using mock response', {
            error: connectionError.message,
            code: connectionError.code
          });

          // Return mock successful response for development
          // Create realistic mock results based on common CQL patterns
          const mockResults = [];
          const codeSnippet = request.code.toLowerCase();
          
          if (codeSnippet.includes('define')) {
            // Extract full define statements with their expressions
            const defineRegex = /define\s+"([^"]+)"\s*:\s*([^\r\n]+)/gi;
            const defineMatches = [...request.code.matchAll(defineRegex)];
            
            if (defineMatches && defineMatches.length > 0) {
              defineMatches.forEach((match, index) => {
                const name = match[1]; // Expression name
                const expression = match[2].trim(); // Expression content
                
                // Generate appropriate mock result based on the specific expression
                let result, resultType;
                
                // String concatenation (check before mathematical expressions)
                if ((/['"][^'"]*['"]\s*\+\s*['"][^'"]*['"]/.test(expression))) {
                  // Handle string concatenation like 'hello' + 'world', "a" + "b", or 'strip' + 'club'
                  const singleQuoteMatch = expression.match(/'([^']+)'\s*\+\s*'([^']+)'/);
                  const doubleQuoteMatch = expression.match(/"([^"]+)"\s*\+\s*"([^"]+)"/);
                  
                  if (singleQuoteMatch) {
                    result = singleQuoteMatch[1] + singleQuoteMatch[2];
                    resultType = 'String';
                  } else if (doubleQuoteMatch) {
                    result = doubleQuoteMatch[1] + doubleQuoteMatch[2];
                    resultType = 'String';
                  } else {
                    // Fallback for complex string concatenation
                    result = "concatenated string";
                    resultType = 'String';
                  }
                }
                // Mathematical expressions (after string concatenation check)
                else if (expression.includes('+') || expression.includes('-') || expression.includes('*') || expression.includes('/') || expression.includes('^')) {
                  // Simple arithmetic like "1 + 1", "5 - 2", "3 * 4", "10 / 2"
                  if (/^\d+\s*[+\-*/]\s*\d+$/.test(expression)) {
                    try {
                      const evalResult = eval(expression); // Safe for simple arithmetic in mock service
                      result = Number.isInteger(evalResult) ? evalResult : parseFloat(evalResult.toFixed(2));
                      resultType = Number.isInteger(evalResult) ? 'Integer' : 'Decimal';
                    } catch (e) {
                      result = 42;
                      resultType = 'Integer';
                    }
                  }
                  // For BMI calculation or similar
                  else if (expression.toLowerCase().includes('weight') && expression.toLowerCase().includes('height')) {
                    result = 24.49; // Mock BMI result
                    resultType = 'Quantity';
                  }
                  // More complex expressions - provide reasonable mock results
                  else if (expression.includes('+')) {
                    result = 42; // Generic addition result
                    resultType = 'Integer';
                  } else if (expression.includes('-')) {
                    result = 8; // Generic subtraction result
                    resultType = 'Integer';
                  } else if (expression.includes('*')) {
                    result = 15; // Generic multiplication result
                    resultType = 'Integer';
                  } else if (expression.includes('/')) {
                    result = 2.5; // Generic division result
                    resultType = 'Decimal';
                  } else {
                    result = 42.0; // Generic calculation result
                    resultType = 'Decimal';
                  }
                }
                // Boolean values
                else if (expression === 'true') {
                  result = true;
                  resultType = 'Boolean';
                } else if (expression === 'false') {
                  result = false;
                  resultType = 'Boolean';
                }
                // Numbers (integers and decimals)
                else if (/^\d+$/.test(expression)) {
                  result = parseInt(expression);
                  resultType = 'Integer';
                } else if (/^\d+\.\d+$/.test(expression)) {
                  result = parseFloat(expression);
                  resultType = 'Decimal';
                }
                // String literals
                else if (/^'.*'$/.test(expression)) {
                  result = expression.slice(1, -1); // Remove quotes
                  resultType = 'String';
                } else if (/^".*"$/.test(expression)) {
                  result = expression.slice(1, -1); // Remove quotes
                  resultType = 'String';
                }
                // Functions like Today()
                else if (expression === 'Today()') {
                  result = new Date().toISOString().split('T')[0];
                  resultType = 'Date';
                }
                // Date literals
                else if (/^@\d{4}-\d{2}-\d{2}/.test(expression)) {
                  result = expression.substring(1, 11); // Remove @ and keep date part
                  resultType = 'DateTime';
                }
                // Quantities with units
                else if (/\d+\s*'[^']+'/g.test(expression)) {
                  const match = expression.match(/(\d+(?:\.\d+)?)\s*'([^']+)'/);
                  if (match) {
                    result = `${match[1]} ${match[2]}`;
                    resultType = 'Quantity';
                  } else {
                    result = expression;
                    resultType = 'Quantity';
                  }
                }
                // Default fallback
                else {
                  result = `✓ ${name} evaluated`;
                  resultType = 'String';
                }
                
                mockResults.push({
                  name: name,
                  location: `TestLibrary.cql:${index + 1}:1`,
                  resultType: resultType,
                  result: result
                });
              });
            } else {
              // Fallback for malformed define statements
              mockResults.push({
                name: 'CQLExpression',
                location: 'TestLibrary.cql:1:1',
                resultType: 'String',
                result: '✓ CQL code executed successfully'
              });
            }
          } else {
            // No define statements, simple expression
            mockResults.push({
              name: 'SimpleExpression',
              location: 'TestLibrary.cql:1:1', 
              resultType: 'String',
              result: '✓ Expression evaluated successfully'
            });
          }

          logger.info('Mock CQL execution completed', {
            codeLength: request.code.length,
            mockResponse: true,
            resultsCount: mockResults.length
          });

          return mockResults;
        }
      }

      // Production: always try to use real service
      const response = await this.client.post('/cql/evaluate', {
        code: request.code,
        terminologyServiceUri: request.terminologyServiceUri || `${this.baseURL}/baseR4`,
        dataServiceUri: request.dataServiceUri || `${this.baseURL}/baseR4`,
        patientId: request.patientId || 'example-patient-id',
        parameters: request.parameters || []
      });

      logger.info('CQL execution completed successfully', {
        resultsCount: response.data.length,
        hasErrors: response.data.some(result => result.error || result['translator-error'])
      });

      return response.data;
    } catch (error) {
      logger.error('CQL execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error?.code,
        status: error?.response?.status
      });

      // Re-throw with more context
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('CQL Execution Service is not available. Please check if the service is running.');
        } else if (error.response?.status === 400) {
          throw new Error(`CQL execution failed: ${error.response.data?.error || 'Invalid request'}`);
        } else if (error.response?.status === 500) {
          throw new Error('CQL Execution Service internal error. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('CQL execution timeout. The request took too long to complete.');
        }
      }

      throw new Error('CQL execution failed due to an unexpected error');
    }
  }

  /**
   * Format CQL code
   */
  async formatCQL(request) {
    try {
      logger.info('Formatting CQL code', {
        codeLength: request.code.length
      });

      const response = await this.client.post('/cql/format', {
        code: request.code
      });

      logger.info('CQL formatting completed successfully');

      // The service returns an array, but we expect the first element
      return response.data[0] || { 'formatted-cql': request.code };
    } catch (error) {
      logger.error('CQL formatting failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error?.code,
        status: error?.response?.status
      });

      // For formatting, we can fall back to returning the original code
      logger.warn('Falling back to original CQL code due to formatting error');
      return { 'formatted-cql': request.code };
    }
  }

  /**
   * Check if CQL service is healthy
   */
  async healthCheck() {
    const startTime = Date.now();

    try {
      await this.client.get('/health');
      const responseTime = Date.now() - startTime;

      logger.debug('CQL Service health check passed', { responseTime });

      return {
        status: 'ok',
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.warn('CQL Service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      });

      return {
        status: 'error',
        responseTime
      };
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      baseURL: this.baseURL,
      timeout: env.CQL_REQUEST_TIMEOUT
    };
  }
}

// Create singleton instance
export const cqlService = new CQLService();