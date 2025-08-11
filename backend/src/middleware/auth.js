import jwt from 'jsonwebtoken';
import authService from '../services/authService.js';

/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user information to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No valid token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const verificationResult = await authService.verifyToken(token);
    
    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Attach user to request
    req.user = verificationResult.user;
    req.userId = verificationResult.userId;

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user information if token is provided, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const verificationResult = await authService.verifyToken(token);
      
      if (verificationResult.success) {
        req.user = verificationResult.user;
        req.userId = verificationResult.userId;
      }
    }

    next();

  } catch (error) {
    // In optional auth, we don't fail if token verification fails
    console.warn('Optional authentication failed:', error.message);
    next();
  }
};

/**
 * Role-based authorization middleware
 * Requires specific roles to access the endpoint
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Required roles: ' + requiredRoles.join(', ')
      });
    }

    next();
  };
};

/**
 * Admin authorization middleware
 * Requires admin role
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Instructor authorization middleware
 * Requires instructor or admin role
 */
export const requireInstructor = requireRole(['instructor', 'admin']);

/**
 * Permission-based authorization middleware
 * Checks for specific permissions
 */
export const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // For now, we'll use a simple role-based check
    // In a more complex system, this would check actual permissions
    const userPermissions = getUserPermissions(req.user.role);
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Resource ownership middleware
 * Ensures user owns the resource or has admin privileges
 */
export const requireOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const resourceUserId = req.params.userId || req.body[resourceUserIdField];
    
    // Allow if user owns the resource or is admin
    if (req.user.id === resourceUserId || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.'
      });
    }
  };
};

/**
 * Rate limiting by user
 * Different rate limits for different user types
 */
export const userBasedRateLimit = (req, res, next) => {
  // This would integrate with express-rate-limit
  // Different limits based on user role/subscription level
  
  if (!req.user) {
    // Anonymous users get lower limits
    req.rateLimit = { max: 10, windowMs: 15 * 60 * 1000 };
  } else {
    switch (req.user.role) {
      case 'admin':
        req.rateLimit = { max: 1000, windowMs: 15 * 60 * 1000 };
        break;
      case 'instructor':
        req.rateLimit = { max: 200, windowMs: 15 * 60 * 1000 };
        break;
      case 'premium':
        req.rateLimit = { max: 100, windowMs: 15 * 60 * 1000 };
        break;
      default:
        req.rateLimit = { max: 50, windowMs: 15 * 60 * 1000 };
    }
  }

  next();
};

/**
 * Account status validation middleware
 * Ensures user account is active and verified if required
 */
export const validateAccountStatus = (options = {}) => {
  const { requireVerification = false, requireActive = true } = options;
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if account is active
    if (requireActive && !req.user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Please contact support.'
      });
    }

    // Check if email verification is required
    if (requireVerification && !req.user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email verification required. Please check your email and verify your account.'
      });
    }

    next();
  };
};

/**
 * API version middleware
 * Handles different API versions (if needed)
 */
export const apiVersion = (version) => {
  return (req, res, next) => {
    req.apiVersion = version;
    next();
  };
};

/**
 * Audit logging middleware
 * Logs important authentication events
 */
export const auditAuth = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response
      if (req.user) {
        console.log(`AUDIT: ${action}`, {
          userId: req.user.id,
          email: req.user.email,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
          success: res.statusCode < 400
        });
      }
      
      originalSend.call(this, data);
    };

    next();
  };
};

// Helper functions

/**
 * Get permissions for a user role
 * This would typically be stored in a database or configuration
 */
function getUserPermissions(role) {
  const rolePermissions = {
    learner: [
      'read_exercises',
      'submit_solutions',
      'view_hints',
      'read_tutorials',
      'update_profile'
    ],
    instructor: [
      'read_exercises',
      'create_exercises',
      'update_exercises',
      'delete_own_exercises',
      'read_tutorials',
      'create_tutorials',
      'update_tutorials',
      'delete_own_tutorials',
      'view_analytics',
      'manage_students'
    ],
    admin: [
      'read_exercises',
      'create_exercises', 
      'update_exercises',
      'delete_exercises',
      'read_tutorials',
      'create_tutorials',
      'update_tutorials',
      'delete_tutorials',
      'view_analytics',
      'manage_users',
      'manage_system'
    ],
    developer: [
      'read_exercises',
      'create_exercises',
      'update_exercises',
      'read_tutorials',
      'create_tutorials',
      'view_analytics',
      'api_access'
    ]
  };

  return rolePermissions[role] || rolePermissions.learner;
}

/**
 * Extract user ID from various sources
 */
export const extractUserId = (req) => {
  return req.user?.id || req.params.userId || req.query.userId || req.body.userId;
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (user, permission) => {
  const permissions = getUserPermissions(user.role);
  return permissions.includes(permission);
};

/**
 * Check if user can access resource
 */
export const canAccessResource = (user, resource, action = 'read') => {
  // Admin can access everything
  if (user.role === 'admin') {
    return true;
  }

  // Owner can access their own resources
  if (resource.userId === user.id || resource.authorId === user.id) {
    return true;
  }

  // Check if resource is public (for read operations)
  if (action === 'read' && resource.isPublic) {
    return true;
  }

  // Check role-based permissions
  const permissions = getUserPermissions(user.role);
  const requiredPermission = `${action}_${resource.type || 'resource'}`;
  
  return permissions.includes(requiredPermission);
};

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireInstructor,
  requirePermission,
  requireOwnership,
  userBasedRateLimit,
  validateAccountStatus,
  apiVersion,
  auditAuth,
  extractUserId,
  hasPermission,
  canAccessResource
};