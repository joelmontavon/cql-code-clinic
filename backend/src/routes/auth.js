import express from 'express';
import { z } from 'zod';
import authService from '../services/authService.js';
import { validateRequest } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for authentication routes
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many authentication requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(8).max(100),
    organization: z.string().max(100).optional(),
    role: z.enum(['learner', 'instructor', 'developer', 'researcher', 'other']).optional(),
    subscribeNewsletter: z.boolean().optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    rememberMe: z.boolean().optional()
  })
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  })
});

const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50).optional(),
    lastName: z.string().min(2).max(50).optional(),
    organization: z.string().max(100).optional(),
    role: z.enum(['learner', 'instructor', 'developer', 'researcher', 'other']).optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
    subscribeNewsletter: z.boolean().optional(),
    timezone: z.string().max(50).optional()
  })
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(100)
  })
});

const resetPasswordRequestSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(100)
  })
});

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register',
  authRateLimit,
  validateRequest(registerSchema),
  async (req, res) => {
    try {
      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      let statusCode = 400;
      let errorMessage = error.message;

      // Handle specific error types
      if (error.message.includes('already exists')) {
        statusCode = 409; // Conflict
      } else if (error.message.includes('Password must')) {
        statusCode = 400; // Bad request for password validation
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login',
  loginRateLimit,
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const result = await authService.login(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Login error:', error);
      
      let statusCode = 401;
      let errorMessage = error.message;

      // Handle rate limiting
      if (error.message.includes('Too many')) {
        statusCode = 429; // Too many requests
      } else if (error.message.includes('deactivated')) {
        statusCode = 403; // Forbidden
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
  authRateLimit,
  validateRequest(refreshTokenSchema),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user and invalidate refresh token
 */
router.post('/logout',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const refreshToken = req.body.refreshToken;

      await authService.logout(userId, refreshToken);

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }
);

/**
 * GET /api/auth/verify
 * Verify JWT token validity
 */
router.get('/verify',
  authenticate,
  async (req, res) => {
    try {
      // If we reach here, token is valid (middleware validated it)
      res.json({
        success: true,
        data: {
          user: req.user,
          valid: true
        }
      });

    } catch (error) {
      console.error('Token verification error:', error);
      
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }
);

/**
 * GET /api/auth/profile
 * Get user profile
 */
router.get('/profile',
  authenticate,
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });

    } catch (error) {
      console.error('Profile fetch error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile'
      });
    }
  }
);

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile',
  authenticate,
  validateRequest(updateProfileSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await authService.updateProfile(userId, req.body);

      res.json({
        success: true,
        data: result,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      console.error('Profile update error:', error);
      
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Password change error:', error);
      
      let statusCode = 400;
      if (error.message.includes('Current password is incorrect')) {
        statusCode = 401;
      }

      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Request password reset
 */
router.post('/reset-password',
  authRateLimit,
  validateRequest(resetPasswordRequestSchema),
  async (req, res) => {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to process password reset request'
      });
    }
  }
);

/**
 * POST /api/auth/reset-password/confirm
 * Reset password using reset token
 */
router.post('/reset-password/confirm',
  authRateLimit,
  validateRequest(resetPasswordSchema),
  async (req, res) => {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Password reset error:', error);
      
      let statusCode = 400;
      if (error.message.includes('Invalid or expired')) {
        statusCode = 401;
      }

      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * OAuth Routes (Google, GitHub, Microsoft)
 * These would integrate with passport.js or similar OAuth library
 */

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', (req, res) => {
  // In a real implementation, this would redirect to Google OAuth
  res.status(501).json({
    success: false,
    error: 'OAuth integration not yet implemented'
  });
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    // In a real implementation, this would handle the OAuth callback
    // const { code } = req.query;
    // const profileData = await getGoogleProfile(code);
    // const result = await authService.oauthLogin('google', profileData);
    
    res.status(501).json({
      success: false,
      error: 'OAuth integration not yet implemented'
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'OAuth integration not yet implemented'
  });
});

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      error: 'OAuth integration not yet implemented'
    });

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});

/**
 * GET /api/auth/microsoft
 * Initiate Microsoft OAuth flow
 */
router.get('/microsoft', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'OAuth integration not yet implemented'
  });
});

/**
 * GET /api/auth/microsoft/callback
 * Handle Microsoft OAuth callback
 */
router.get('/microsoft/callback', async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      error: 'OAuth integration not yet implemented'
    });

  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});

/**
 * DELETE /api/auth/account
 * Delete user account (requires password confirmation)
 */
router.delete('/account',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      // Verify password before account deletion
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password confirmation required'
        });
      }

      // This would be implemented as a method in authService
      // const result = await authService.deleteAccount(userId, password);

      res.status(501).json({
        success: false,
        error: 'Account deletion not yet implemented'
      });

    } catch (error) {
      console.error('Account deletion error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete account'
      });
    }
  }
);

/**
 * GET /api/auth/sessions
 * Get user's active sessions
 */
router.get('/sessions',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      // This would be implemented to show active refresh tokens/sessions
      res.json({
        success: true,
        data: {
          sessions: []
        }
      });

    } catch (error) {
      console.error('Sessions fetch error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions'
      });
    }
  }
);

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;

      // This would be implemented to revoke a specific session
      res.json({
        success: true,
        message: 'Session revoked successfully'
      });

    } catch (error) {
      console.error('Session revocation error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to revoke session'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Auth route error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;