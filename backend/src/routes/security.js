import express from 'express';
import securityMonitoringService from '../services/securityMonitoringService.js';
import { 
  authenticateToken, 
  requireRole, 
  securityAuditLog,
  rateLimits 
} from '../middleware/security.js';
import { body, query, validationResult } from 'express-validator';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Apply security audit logging to all security routes
router.use(securityAuditLog);

// Apply rate limiting
router.use(rateLimits.api);

/**
 * GET /api/security/status
 * Get security system status (admin only)
 */
router.get('/status', 
  authenticateToken,
  requireRole(['admin', 'security']),
  async (req, res) => {
    try {
      const timeWindow = req.query.window || '24h';
      const metrics = securityMonitoringService.getSecurityMetrics(timeWindow);
      
      const status = {
        system: {
          monitoring: 'active',
          threatDetection: 'enabled',
          automaticBlocking: 'enabled',
          lastUpdate: new Date().toISOString()
        },
        metrics,
        blockedIPs: {
          count: metrics.blockedIPs,
          recent: Array.from(securityMonitoringService.blockedIPs).slice(0, 10)
        },
        configuration: {
          maxLoginAttempts: securityMonitoringService.config.maxLoginAttempts,
          lockoutDuration: securityMonitoringService.config.loginLockoutDuration,
          suspiciousThreshold: securityMonitoringService.config.suspiciousActivityThreshold,
          anomalyDetection: securityMonitoringService.config.anomalyDetectionEnabled
        }
      };
      
      res.json({
        success: true,
        data: status
      });
      
    } catch (error) {
      logger.error('Security status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve security status'
      });
    }
  }
);

/**
 * GET /api/security/events
 * Get security events with filtering (admin only)
 */
router.get('/events',
  authenticateToken,
  requireRole(['admin', 'security']),
  [
    query('type').optional().isString().trim().escape(),
    query('ip').optional().isIP(),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('timeWindow').optional().isString().matches(/^\d+[smhd]$/)
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }
      
      const {
        type,
        ip,
        severity,
        limit = 50,
        offset = 0,
        timeWindow = '24h'
      } = req.query;
      
      // Get events from monitoring service
      const allEvents = Array.from(securityMonitoringService.securityEvents.values());
      
      // Apply time filter
      const windowMs = securityMonitoringService.parseTimeWindow(timeWindow);
      const cutoffTime = Date.now() - windowMs;
      
      let filteredEvents = allEvents.filter(event => event.timestamp >= cutoffTime);
      
      // Apply filters
      if (type) {
        filteredEvents = filteredEvents.filter(event => event.type === type);
      }
      
      if (ip) {
        filteredEvents = filteredEvents.filter(event => event.ip === ip);
      }
      
      if (severity) {
        filteredEvents = filteredEvents.filter(event => event.data.severity === severity);
      }
      
      // Sort by timestamp (most recent first)
      filteredEvents.sort((a, b) => b.timestamp - a.timestamp);
      
      // Apply pagination
      const paginatedEvents = filteredEvents.slice(offset, offset + limit);
      
      res.json({
        success: true,
        data: {
          events: paginatedEvents,
          total: filteredEvents.length,
          limit,
          offset,
          timeWindow
        }
      });
      
    } catch (error) {
      logger.error('Security events error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve security events'
      });
    }
  }
);

/**
 * POST /api/security/block-ip
 * Block IP address manually (admin only)
 */
router.post('/block-ip',
  authenticateToken,
  requireRole(['admin', 'security']),
  [
    body('ip').isIP().withMessage('Valid IP address required'),
    body('reason').isString().isLength({ min: 1, max: 500 }).trim().escape()
      .withMessage('Reason must be between 1 and 500 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }
      
      const { ip, reason } = req.body;
      
      // Check if IP is already blocked
      if (securityMonitoringService.isIPBlocked(ip)) {
        return res.status(409).json({
          success: false,
          error: 'IP address is already blocked'
        });
      }
      
      // Block the IP
      securityMonitoringService.blockIP(ip, `Manual block by ${req.user.username}: ${reason}`);
      
      logger.info('IP manually blocked', {
        ip,
        reason,
        blockedBy: req.user.username,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        message: 'IP address blocked successfully'
      });
      
    } catch (error) {
      logger.error('Block IP error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to block IP address'
      });
    }
  }
);

/**
 * DELETE /api/security/block-ip/:ip
 * Unblock IP address (admin only)
 */
router.delete('/block-ip/:ip',
  authenticateToken,
  requireRole(['admin', 'security']),
  [
    body('reason').optional().isString().isLength({ max: 500 }).trim().escape()
  ],
  async (req, res) => {
    try {
      const { ip } = req.params;
      const { reason = 'Manual unblock' } = req.body;
      
      // Validate IP address
      if (!securityMonitoringService.getClientIP({ ip })) {
        return res.status(400).json({
          success: false,
          error: 'Invalid IP address'
        });
      }
      
      // Check if IP is blocked
      if (!securityMonitoringService.isIPBlocked(ip)) {
        return res.status(404).json({
          success: false,
          error: 'IP address is not blocked'
        });
      }
      
      // Unblock the IP
      securityMonitoringService.unblockIP(ip, `Manual unblock by ${req.user.username}: ${reason}`);
      
      logger.info('IP manually unblocked', {
        ip,
        reason,
        unblockedBy: req.user.username,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        message: 'IP address unblocked successfully'
      });
      
    } catch (error) {
      logger.error('Unblock IP error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unblock IP address'
      });
    }
  }
);

/**
 * GET /api/security/blocked-ips
 * Get list of blocked IP addresses (admin only)
 */
router.get('/blocked-ips',
  authenticateToken,
  requireRole(['admin', 'security']),
  async (req, res) => {
    try {
      const blockedIPs = Array.from(securityMonitoringService.blockedIPs);
      const suspiciousIPs = Array.from(securityMonitoringService.suspiciousActivities.entries())
        .map(([ip, data]) => ({
          ip,
          score: data.totalScore,
          firstSeen: new Date(data.firstSeen).toISOString(),
          lastSeen: new Date(data.lastSeen).toISOString(),
          activities: Object.fromEntries(data.activities)
        }));
      
      res.json({
        success: true,
        data: {
          blocked: blockedIPs,
          suspicious: suspiciousIPs,
          total: {
            blocked: blockedIPs.length,
            suspicious: suspiciousIPs.length
          }
        }
      });
      
    } catch (error) {
      logger.error('Blocked IPs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve blocked IP addresses'
      });
    }
  }
);

/**
 * GET /api/security/threats
 * Get threat analysis and statistics (admin only)
 */
router.get('/threats',
  authenticateToken,
  requireRole(['admin', 'security']),
  [
    query('timeWindow').optional().isString().matches(/^\d+[smhd]$/)
  ],
  async (req, res) => {
    try {
      const timeWindow = req.query.timeWindow || '24h';
      const metrics = securityMonitoringService.getSecurityMetrics(timeWindow);
      
      // Analyze threat patterns
      const threatAnalysis = {
        overview: {
          totalThreats: metrics.totalEvents,
          criticalThreats: Object.entries(metrics.eventsByType)
            .filter(([type]) => ['command_injection', 'sql_injection', 'brute_force_attempt'].includes(type))
            .reduce((sum, [, count]) => sum + count, 0),
          topThreatTypes: Object.entries(metrics.eventsByType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => ({ type, count })),
          timeWindow
        },
        attackers: {
          topIPs: metrics.topAttackerIPs,
          uniqueIPs: metrics.topAttackerIPs.length,
          blockedIPs: metrics.blockedIPs
        },
        trends: {
          // This would require historical data storage for real trend analysis
          // For now, provide basic current period data
          currentPeriod: metrics.eventsByType,
          riskLevel: this.calculateRiskLevel(metrics)
        }
      };
      
      res.json({
        success: true,
        data: threatAnalysis
      });
      
    } catch (error) {
      logger.error('Threats analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze threats'
      });
    }
  }
);

/**
 * POST /api/security/scan-request
 * Manually trigger security scan on request data (admin only)
 */
router.post('/scan-request',
  authenticateToken,
  requireRole(['admin', 'security']),
  [
    body('method').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    body('url').isURL({ require_tld: false }),
    body('headers').optional().isObject(),
    body('body').optional().isObject(),
    body('query').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }
      
      const { method, url, headers = {}, body = {}, query = {} } = req.body;
      
      // Create mock request object for threat detection
      const mockRequest = {
        method,
        url,
        path: new URL(url, 'http://localhost').pathname,
        headers,
        body,
        query,
        params: {},
        get: (header) => headers[header.toLowerCase()],
        ip: req.ip
      };
      
      // Run threat detection
      const threats = securityMonitoringService.detectThreats(mockRequest);
      
      const scanResult = {
        timestamp: new Date().toISOString(),
        request: {
          method,
          url,
          hasBody: Object.keys(body).length > 0,
          hasQuery: Object.keys(query).length > 0
        },
        threats: {
          count: threats.length,
          details: threats,
          riskLevel: this.calculateThreatRiskLevel(threats)
        },
        scannedBy: req.user.username
      };
      
      // Log the manual scan
      logger.info('Manual security scan performed', {
        ...scanResult,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data: scanResult
      });
      
    } catch (error) {
      logger.error('Security scan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform security scan'
      });
    }
  }
);

/**
 * GET /api/security/export
 * Export security data for analysis (admin only)
 */
router.get('/export',
  authenticateToken,
  requireRole(['admin']),
  [
    query('timeWindow').optional().isString().matches(/^\d+[smhd]$/),
    query('format').optional().isIn(['json', 'csv'])
  ],
  async (req, res) => {
    try {
      const timeWindow = req.query.timeWindow || '24h';
      const format = req.query.format || 'json';
      
      const exportData = securityMonitoringService.exportSecurityData(timeWindow);
      
      // Log the export
      logger.info('Security data exported', {
        timeWindow,
        format,
        eventCount: exportData.events.length,
        exportedBy: req.user.username,
        userId: req.user.id
      });
      
      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(exportData.events);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="security-export-${Date.now()}.csv"`);
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="security-export-${Date.now()}.json"`);
        res.json({
          success: true,
          data: exportData
        });
      }
      
    } catch (error) {
      logger.error('Security export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export security data'
      });
    }
  }
);

/**
 * Helper function to calculate risk level
 */
function calculateRiskLevel(metrics) {
  const criticalEvents = ['command_injection', 'sql_injection', 'brute_force_attempt'];
  const highEvents = ['path_traversal', 'xss_attempt'];
  
  const criticalCount = criticalEvents.reduce((sum, type) => 
    sum + (metrics.eventsByType[type] || 0), 0);
  const highCount = highEvents.reduce((sum, type) => 
    sum + (metrics.eventsByType[type] || 0), 0);
  
  if (criticalCount > 10) return 'critical';
  if (criticalCount > 5 || highCount > 20) return 'high';
  if (criticalCount > 0 || highCount > 10) return 'medium';
  return 'low';
}

/**
 * Helper function to calculate threat risk level
 */
function calculateThreatRiskLevel(threats) {
  if (threats.some(t => t.severity === 'critical')) return 'critical';
  if (threats.some(t => t.severity === 'high')) return 'high';
  if (threats.some(t => t.severity === 'medium')) return 'medium';
  if (threats.length > 0) return 'low';
  return 'none';
}

/**
 * Helper function to convert events to CSV
 */
function convertToCSV(events) {
  if (events.length === 0) return '';
  
  const headers = ['timestamp', 'type', 'ip', 'method', 'url', 'userAgent', 'description'];
  const csvRows = [headers.join(',')];
  
  events.forEach(event => {
    const row = [
      new Date(event.timestamp).toISOString(),
      event.type,
      event.ip || '',
      event.method || '',
      event.url || '',
      (event.userAgent || '').replace(/"/g, '""'),
      (event.data?.description || '').replace(/"/g, '""')
    ];
    csvRows.push(row.map(field => `"${field}"`).join(','));
  });
  
  return csvRows.join('\n');
}

export default router;