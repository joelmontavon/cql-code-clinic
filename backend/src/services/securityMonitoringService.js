import winston from 'winston';
import crypto from 'crypto';
import geoip from 'geoip-lite';
import useragent from 'useragent';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Security Monitoring Service
 * Provides threat detection, anomaly detection, and security event tracking
 */
export class SecurityMonitoringService {
  constructor() {
    this.securityEvents = new Map();
    this.suspiciousActivities = new Map();
    this.blockedIPs = new Set();
    this.trustedIPs = new Set();
    this.loginAttempts = new Map();
    
    this.config = {
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
      loginLockoutDuration: parseInt(process.env.LOGIN_LOCKOUT_DURATION) || 30 * 60 * 1000, // 30 minutes
      suspiciousActivityThreshold: 10,
      anomalyDetectionEnabled: process.env.ANOMALY_DETECTION === 'true',
      alertWebhook: process.env.SECURITY_ALERT_WEBHOOK,
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    
    // Threat detection patterns
    this.threatPatterns = {
      sqlInjection: [
        /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
        /('|(\\)|(\-\-)|(\;)|(\|)|(\*)|(%27)|(%22)|(%2D)|(%7C))/i,
        /(exec|execute|sp_|xp_)/i
      ],
      xssAttempts: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe|<object|<embed|<form/i
      ],
      pathTraversal: [
        /\.\.[\/\\]/,
        /%2e%2e[%2f%5c]/i,
        /\.\.[%2f%5c]/i,
        /%c0%ae%c0%ae/i
      ],
      commandInjection: [
        /(\||&|;|\$\(|\`|<|>)/,
        /(nc|netcat|wget|curl|bash|sh|cmd|powershell)/i,
        /(\bcat\b|\bls\b|\bps\b|\bwhoami\b|\bid\b)/i
      ],
      bruteForce: {
        timeWindow: 5 * 60 * 1000, // 5 minutes
        maxAttempts: 10
      }
    };
    
    // Initialize trusted IPs (common CDN and proxy IPs)
    this.initializeTrustedIPs();
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }
  
  /**
   * Initialize trusted IP ranges (CDNs, load balancers, etc.)
   */
  initializeTrustedIPs() {
    const trustedIPRanges = [
      // Add your CDN and load balancer IPs here
      '127.0.0.1',
      '::1'
    ];
    
    if (process.env.TRUSTED_IPS) {
      const additionalIPs = process.env.TRUSTED_IPS.split(',');
      trustedIPRanges.push(...additionalIPs);
    }
    
    trustedIPRanges.forEach(ip => this.trustedIPs.add(ip.trim()));
  }
  
  /**
   * Track security event
   * @param {string} eventType - Type of security event
   * @param {Object} eventData - Event data
   * @param {Object} request - Express request object
   */
  trackSecurityEvent(eventType, eventData, request = null) {
    const eventId = crypto.randomUUID();
    const timestamp = Date.now();
    
    const event = {
      id: eventId,
      type: eventType,
      timestamp,
      data: eventData,
      ...this.extractRequestInfo(request)
    };
    
    this.securityEvents.set(eventId, event);
    
    // Log the event
    logger.warn('Security event detected', event);
    
    // Check if this triggers an alert
    this.checkForAlerts(event);
    
    // Update suspicious activity tracking
    if (request) {
      this.updateSuspiciousActivity(this.getClientIP(request), eventType);
    }
    
    return eventId;
  }
  
  /**
   * Extract request information for security logging
   * @param {Object} request - Express request object
   * @returns {Object} Extracted request info
   */
  extractRequestInfo(request) {
    if (!request) return {};
    
    const ip = this.getClientIP(request);
    const userAgent = request.get('User-Agent') || 'Unknown';
    const agent = useragent.parse(userAgent);
    const geo = geoip.lookup(ip);
    
    return {
      ip,
      userAgent,
      browser: {
        family: agent.family,
        version: agent.toVersion(),
        os: agent.os.toString()
      },
      geo: geo ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone
      } : null,
      headers: {
        referer: request.get('Referer'),
        origin: request.get('Origin'),
        host: request.get('Host'),
        xForwardedFor: request.get('X-Forwarded-For'),
        xRealIP: request.get('X-Real-IP')
      },
      method: request.method,
      url: request.url,
      path: request.path
    };
  }
  
  /**
   * Get client IP address from request
   * @param {Object} request - Express request object
   * @returns {string} Client IP address
   */
  getClientIP(request) {
    return request.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
           request.get('X-Real-IP') ||
           request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           request.ip ||
           'unknown';
  }
  
  /**
   * Detect potential threats in request data
   * @param {Object} request - Express request object
   * @returns {Array} Detected threats
   */
  detectThreats(request) {
    const threats = [];
    const requestData = this.getRequestData(request);
    
    // Check for SQL injection
    if (this.checkPatterns(requestData, this.threatPatterns.sqlInjection)) {
      threats.push({
        type: 'sql_injection',
        severity: 'high',
        description: 'Potential SQL injection attempt detected'
      });
    }
    
    // Check for XSS attempts
    if (this.checkPatterns(requestData, this.threatPatterns.xssAttempts)) {
      threats.push({
        type: 'xss_attempt',
        severity: 'medium',
        description: 'Potential XSS attempt detected'
      });
    }
    
    // Check for path traversal
    if (this.checkPatterns(requestData, this.threatPatterns.pathTraversal)) {
      threats.push({
        type: 'path_traversal',
        severity: 'high',
        description: 'Path traversal attempt detected'
      });
    }
    
    // Check for command injection
    if (this.checkPatterns(requestData, this.threatPatterns.commandInjection)) {
      threats.push({
        type: 'command_injection',
        severity: 'critical',
        description: 'Command injection attempt detected'
      });
    }
    
    // Check for suspicious headers
    const suspiciousHeaders = this.checkSuspiciousHeaders(request);
    if (suspiciousHeaders.length > 0) {
      threats.push({
        type: 'suspicious_headers',
        severity: 'low',
        description: 'Suspicious headers detected',
        details: suspiciousHeaders
      });
    }
    
    return threats;
  }
  
  /**
   * Get request data for threat detection
   * @param {Object} request - Express request object
   * @returns {string} Combined request data
   */
  getRequestData(request) {
    const parts = [
      request.url,
      request.path,
      JSON.stringify(request.query || {}),
      JSON.stringify(request.body || {}),
      JSON.stringify(request.params || {})
    ];
    
    return parts.join(' ').toLowerCase();
  }
  
  /**
   * Check patterns against request data
   * @param {string} data - Request data
   * @param {Array} patterns - Regex patterns to check
   * @returns {boolean} Pattern match found
   */
  checkPatterns(data, patterns) {
    return patterns.some(pattern => pattern.test(data));
  }
  
  /**
   * Check for suspicious headers
   * @param {Object} request - Express request object
   * @returns {Array} Suspicious headers found
   */
  checkSuspiciousHeaders(request) {
    const suspicious = [];
    const headers = request.headers;
    
    // Check for suspicious user agents
    const userAgent = headers['user-agent'] || '';
    const suspiciousAgents = [
      'sqlmap', 'nikto', 'dirb', 'dirbuster', 'nessus', 'openvas',
      'burp', 'owasp', 'w3af', 'acunetix', 'netsparker', 'appscan'
    ];
    
    if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
      suspicious.push({
        header: 'user-agent',
        value: userAgent,
        reason: 'Security scanner user agent'
      });
    }
    
    // Check for unusual content types
    const contentType = headers['content-type'] || '';
    const unusualTypes = ['application/x-www-form-urlencoded', 'multipart/form-data'];
    
    if (request.method === 'GET' && unusualTypes.some(type => contentType.includes(type))) {
      suspicious.push({
        header: 'content-type',
        value: contentType,
        reason: 'Unusual content type for GET request'
      });
    }
    
    return suspicious;
  }
  
  /**
   * Track login attempts and detect brute force
   * @param {string} identifier - Username, email, or IP
   * @param {boolean} success - Login success status
   * @param {Object} request - Express request object
   * @returns {Object} Login attempt result
   */
  trackLoginAttempt(identifier, success, request = null) {
    const timestamp = Date.now();
    const ip = request ? this.getClientIP(request) : 'unknown';
    const key = `${identifier}:${ip}`;
    
    if (!this.loginAttempts.has(key)) {
      this.loginAttempts.set(key, {
        attempts: [],
        locked: false,
        lockExpiry: null
      });
    }
    
    const attempts = this.loginAttempts.get(key);
    
    // Check if account is currently locked
    if (attempts.locked && attempts.lockExpiry > timestamp) {
      return {
        allowed: false,
        reason: 'Account locked due to too many failed attempts',
        lockExpiry: attempts.lockExpiry
      };
    } else if (attempts.locked && attempts.lockExpiry <= timestamp) {
      // Unlock account
      attempts.locked = false;
      attempts.lockExpiry = null;
      attempts.attempts = [];
    }
    
    // Add current attempt
    attempts.attempts.push({
      timestamp,
      success,
      ip,
      userAgent: request?.get('User-Agent')
    });
    
    // Remove old attempts (outside the time window)
    const windowStart = timestamp - this.threatPatterns.bruteForce.timeWindow;
    attempts.attempts = attempts.attempts.filter(attempt => attempt.timestamp >= windowStart);
    
    // Check for brute force
    const failedAttempts = attempts.attempts.filter(attempt => !attempt.success);
    
    if (failedAttempts.length >= this.config.maxLoginAttempts) {
      attempts.locked = true;
      attempts.lockExpiry = timestamp + this.config.loginLockoutDuration;
      
      this.trackSecurityEvent('brute_force_attempt', {
        identifier,
        ip,
        failedAttempts: failedAttempts.length,
        lockDuration: this.config.loginLockoutDuration
      }, request);
      
      return {
        allowed: false,
        reason: 'Account locked due to too many failed attempts',
        lockExpiry: attempts.lockExpiry
      };
    }
    
    // Track failed login for security monitoring
    if (!success) {
      this.trackSecurityEvent('failed_login', {
        identifier,
        ip,
        failedAttempts: failedAttempts.length
      }, request);
    }
    
    return {
      allowed: true,
      remainingAttempts: this.config.maxLoginAttempts - failedAttempts.length
    };
  }
  
  /**
   * Update suspicious activity tracking
   * @param {string} ip - IP address
   * @param {string} activityType - Type of suspicious activity
   */
  updateSuspiciousActivity(ip, activityType) {
    if (!this.suspiciousActivities.has(ip)) {
      this.suspiciousActivities.set(ip, {
        activities: new Map(),
        totalScore: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    }
    
    const record = this.suspiciousActivities.get(ip);
    record.lastSeen = Date.now();
    
    // Update activity count
    const currentCount = record.activities.get(activityType) || 0;
    record.activities.set(activityType, currentCount + 1);
    
    // Calculate suspicion score
    const activityScores = {
      'failed_login': 2,
      'sql_injection': 10,
      'xss_attempt': 5,
      'path_traversal': 8,
      'command_injection': 15,
      'brute_force_attempt': 20,
      'rate_limit_exceeded': 1,
      'suspicious_headers': 3
    };
    
    const scoreIncrement = activityScores[activityType] || 1;
    record.totalScore += scoreIncrement;
    
    // Check if IP should be blocked
    if (record.totalScore >= this.config.suspiciousActivityThreshold) {
      this.blockIP(ip, `Suspicious activity score: ${record.totalScore}`);
    }
  }
  
  /**
   * Block IP address
   * @param {string} ip - IP address to block
   * @param {string} reason - Reason for blocking
   */
  blockIP(ip, reason) {
    if (this.trustedIPs.has(ip)) {
      logger.warn('Attempted to block trusted IP', { ip, reason });
      return;
    }
    
    this.blockedIPs.add(ip);
    
    this.trackSecurityEvent('ip_blocked', {
      ip,
      reason,
      automaticBlock: true
    });
    
    logger.warn('IP address blocked', { ip, reason });
  }
  
  /**
   * Check if IP is blocked
   * @param {string} ip - IP address to check
   * @returns {boolean} Is blocked
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }
  
  /**
   * Unblock IP address
   * @param {string} ip - IP address to unblock
   * @param {string} reason - Reason for unblocking
   */
  unblockIP(ip, reason) {
    this.blockedIPs.delete(ip);
    this.suspiciousActivities.delete(ip);
    
    this.trackSecurityEvent('ip_unblocked', {
      ip,
      reason,
      manualUnblock: true
    });
    
    logger.info('IP address unblocked', { ip, reason });
  }
  
  /**
   * Check for security alerts that should trigger notifications
   * @param {Object} event - Security event
   */
  checkForAlerts(event) {
    const criticalEvents = [
      'command_injection',
      'sql_injection',
      'brute_force_attempt',
      'ip_blocked'
    ];
    
    if (criticalEvents.includes(event.type) || event.data.severity === 'critical') {
      this.sendSecurityAlert(event);
    }
  }
  
  /**
   * Send security alert notification
   * @param {Object} event - Security event
   */
  async sendSecurityAlert(event) {
    try {
      const alert = {
        timestamp: new Date(event.timestamp).toISOString(),
        type: event.type,
        severity: event.data.severity || 'high',
        ip: event.ip,
        description: event.data.description || event.type,
        details: event.data,
        geo: event.geo
      };
      
      logger.error('SECURITY ALERT', alert);
      
      // Send webhook notification if configured
      if (this.config.alertWebhook) {
        await this.sendWebhookAlert(alert);
      }
      
      // You could also send email, Slack notification, etc.
    } catch (error) {
      logger.error('Failed to send security alert', error);
    }
  }
  
  /**
   * Send webhook alert
   * @param {Object} alert - Alert data
   */
  async sendWebhookAlert(alert) {
    try {
      const response = await fetch(this.config.alertWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `🚨 Security Alert: ${alert.type}`,
          attachments: [{
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Type', value: alert.type, short: true },
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'IP Address', value: alert.ip, short: true },
              { title: 'Timestamp', value: alert.timestamp, short: true },
              { title: 'Description', value: alert.description, short: false }
            ]
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook alert', error);
    }
  }
  
  /**
   * Get security metrics and statistics
   * @param {string} timeWindow - Time window for metrics (1h, 24h, 7d)
   * @returns {Object} Security metrics
   */
  getSecurityMetrics(timeWindow = '24h') {
    const now = Date.now();
    const windowMs = this.parseTimeWindow(timeWindow);
    const cutoffTime = now - windowMs;
    
    const events = Array.from(this.securityEvents.values())
      .filter(event => event.timestamp >= cutoffTime);
    
    const metrics = {
      totalEvents: events.length,
      eventsByType: {},
      threatsByType: {},
      topAttackerIPs: new Map(),
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousActivities.size,
      timeWindow,
      timestamp: now
    };
    
    // Count events by type
    events.forEach(event => {
      metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1;
      
      if (event.ip) {
        const currentCount = metrics.topAttackerIPs.get(event.ip) || 0;
        metrics.topAttackerIPs.set(event.ip, currentCount + 1);
      }
    });
    
    // Convert top attackers to array and sort
    metrics.topAttackerIPs = Array.from(metrics.topAttackerIPs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
    
    return metrics;
  }
  
  /**
   * Parse time window string to milliseconds
   * @param {string} timeWindow - Time window string
   * @returns {number} Milliseconds
   */
  parseTimeWindow(timeWindow) {
    const matches = timeWindow.match(/^(\d+)([smhd])$/);
    if (!matches) return 24 * 60 * 60 * 1000; // Default 24 hours
    
    const [, value, unit] = matches;
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };
    
    return parseInt(value) * multipliers[unit];
  }
  
  /**
   * Start periodic cleanup of old data
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Clean up old security data
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    let cleanedCount = 0;
    
    // Clean up security events
    for (const [id, event] of this.securityEvents) {
      if (event.timestamp < cutoffTime) {
        this.securityEvents.delete(id);
        cleanedCount++;
      }
    }
    
    // Clean up login attempts
    for (const [key, attempts] of this.loginAttempts) {
      attempts.attempts = attempts.attempts.filter(
        attempt => attempt.timestamp >= cutoffTime
      );
      
      if (attempts.attempts.length === 0 && !attempts.locked) {
        this.loginAttempts.delete(key);
      }
    }
    
    // Clean up suspicious activities
    for (const [ip, record] of this.suspiciousActivities) {
      if (record.lastSeen < cutoffTime) {
        this.suspiciousActivities.delete(ip);
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} old security events`);
    }
  }
  
  /**
   * Export security data for analysis
   * @param {string} timeWindow - Time window for export
   * @returns {Object} Security data export
   */
  exportSecurityData(timeWindow = '24h') {
    const now = Date.now();
    const windowMs = this.parseTimeWindow(timeWindow);
    const cutoffTime = now - windowMs;
    
    return {
      events: Array.from(this.securityEvents.values())
        .filter(event => event.timestamp >= cutoffTime),
      suspiciousActivities: Array.from(this.suspiciousActivities.entries()),
      blockedIPs: Array.from(this.blockedIPs),
      loginAttempts: Array.from(this.loginAttempts.entries()),
      exportTime: now,
      timeWindow
    };
  }
}

// Export singleton instance
export default new SecurityMonitoringService();