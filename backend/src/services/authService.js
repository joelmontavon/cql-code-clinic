import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Authentication Service
 * Handles user registration, login, token management, and OAuth integration
 */
export class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.SALT_ROUNDS = 12;
    
    // Rate limiting
    this.loginAttempts = new Map();
    this.MAX_LOGIN_ATTEMPTS = 5;
    this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result with user and tokens
   */
  async register(userData) {
    try {
      const { firstName, lastName, email, password, organization, role, subscribeNewsletter } = userData;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      // Validate password strength
      this.validatePassword(password);

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          password: hashedPassword,
          organization: organization || null,
          role: role || 'learner',
          subscribeNewsletter: !!subscribeNewsletter,
          emailVerificationToken,
          emailVerified: false,
          isActive: true,
          createdAt: new Date(),
          lastLoginAt: new Date()
        }
      });

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Create refresh token record
      await this.createRefreshToken(user.id, tokens.refreshToken);

      // Remove sensitive data from user object
      const safeUser = this.sanitizeUser(user);

      logger.info('User registered successfully', { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      });

      // TODO: Send verification email
      // await this.sendVerificationEmail(user.email, emailVerificationToken);

      return {
        success: true,
        user: safeUser,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        message: 'Registration successful. Please check your email to verify your account.'
      };

    } catch (error) {
      logger.error('Registration failed', { error: error.message, email: userData.email });
      throw error;
    }
  }

  /**
   * Login user with email and password
   * @param {Object} credentials - User login credentials
   * @returns {Promise<Object>} Login result with user and tokens
   */
  async login({ email, password, rememberMe = false }) {
    try {
      const clientId = `login_${email.toLowerCase()}`;

      // Check rate limiting
      if (this.isRateLimited(clientId)) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          userSessions: {
            where: { 
              expiresAt: { gt: new Date() },
              isActive: true
            }
          }
        }
      });

      if (!user) {
        this.recordLoginAttempt(clientId, false);
        throw new Error('Invalid email or password');
      }

      // Check if account is active
      if (!user.isActive) {
        throw new Error('Account has been deactivated. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.recordLoginAttempt(clientId, false);
        throw new Error('Invalid email or password');
      }

      // Clear failed attempts
      this.clearLoginAttempts(clientId);

      // Generate tokens
      const tokenExpiry = rememberMe ? '30d' : this.JWT_EXPIRES_IN;
      const tokens = this.generateTokens(user, tokenExpiry);

      // Create or update refresh token
      await this.createRefreshToken(user.id, tokens.refreshToken, rememberMe);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          loginCount: { increment: 1 }
        }
      });

      // Remove sensitive data
      const safeUser = this.sanitizeUser(user);

      logger.info('User logged in successfully', { 
        userId: user.id, 
        email: user.email,
        rememberMe 
      });

      return {
        success: true,
        user: safeUser,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokenExpiry
      };

    } catch (error) {
      logger.error('Login failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * OAuth login (Google, GitHub, Microsoft)
   * @param {string} provider - OAuth provider
   * @param {Object} profileData - Profile data from OAuth provider
   * @returns {Promise<Object>} Login result
   */
  async oauthLogin(provider, profileData) {
    try {
      const { email, name, firstName, lastName, picture, providerId } = profileData;

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (user) {
        // Update OAuth provider info
        await prisma.user.update({
          where: { id: user.id },
          data: {
            [`${provider}Id`]: providerId,
            avatar: picture || user.avatar,
            lastLoginAt: new Date(),
            loginCount: { increment: 1 }
          }
        });
      } else {
        // Create new user from OAuth data
        user = await prisma.user.create({
          data: {
            firstName: firstName || name?.split(' ')[0] || '',
            lastName: lastName || name?.split(' ').slice(1).join(' ') || '',
            email: email.toLowerCase(),
            avatar: picture,
            [`${provider}Id`]: providerId,
            emailVerified: true, // OAuth emails are pre-verified
            isActive: true,
            role: 'learner',
            createdAt: new Date(),
            lastLoginAt: new Date(),
            loginCount: 1
          }
        });

        logger.info('New user created via OAuth', { 
          userId: user.id, 
          email: user.email,
          provider 
        });
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Create refresh token
      await this.createRefreshToken(user.id, tokens.refreshToken);

      const safeUser = this.sanitizeUser(user);

      return {
        success: true,
        user: safeUser,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };

    } catch (error) {
      logger.error('OAuth login failed', { error: error.message, provider, email: profileData.email });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET);

      // Check if refresh token exists and is valid
      const storedRefreshToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!storedRefreshToken || !storedRefreshToken.isActive || storedRefreshToken.expiresAt < new Date()) {
        throw new Error('Invalid refresh token');
      }

      // Check if user is still active
      if (!storedRefreshToken.user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Generate new tokens
      const tokens = this.generateTokens(storedRefreshToken.user);

      // Update refresh token
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: {
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + this.parseTokenExpiry(this.JWT_REFRESH_EXPIRES_IN)),
          lastUsedAt: new Date()
        }
      });

      const safeUser = this.sanitizeUser(storedRefreshToken.user);

      return {
        success: true,
        user: safeUser,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };

    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user and invalidate tokens
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token to invalidate (optional)
   * @returns {Promise<Object>} Logout result
   */
  async logout(userId, refreshToken = null) {
    try {
      if (refreshToken) {
        // Invalidate specific refresh token
        await prisma.refreshToken.updateMany({
          where: {
            userId,
            token: refreshToken,
            isActive: true
          },
          data: {
            isActive: false,
            revokedAt: new Date()
          }
        });
      } else {
        // Invalidate all refresh tokens for user
        await prisma.refreshToken.updateMany({
          where: {
            userId,
            isActive: true
          },
          data: {
            isActive: false,
            revokedAt: new Date()
          }
        });
      }

      logger.info('User logged out successfully', { userId });

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      logger.error('Logout failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Token verification result
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      
      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return {
        success: true,
        userId: decoded.userId,
        user: this.sanitizeUser(user)
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Update result
   */
  async updateProfile(userId, updates) {
    try {
      const allowedUpdates = [
        'firstName', 'lastName', 'organization', 'role', 
        'bio', 'avatar', 'subscribeNewsletter', 'timezone'
      ];

      // Filter only allowed updates
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid updates provided');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...filteredUpdates,
          updatedAt: new Date()
        }
      });

      const safeUser = this.sanitizeUser(updatedUser);

      logger.info('User profile updated', { userId, updates: Object.keys(filteredUpdates) });

      return {
        success: true,
        user: safeUser
      };

    } catch (error) {
      logger.error('Profile update failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Password change result
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Invalidate all refresh tokens to force re-login
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          isActive: true
        },
        data: {
          isActive: false,
          revokedAt: new Date()
        }
      });

      logger.info('User password changed', { userId });

      return {
        success: true,
        message: 'Password changed successfully. Please log in again.'
      };

    } catch (error) {
      logger.error('Password change failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset request result
   */
  async requestPasswordReset(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // Don't reveal if email exists or not
      if (!user) {
        return {
          success: true,
          message: 'If an account with this email exists, you will receive reset instructions.'
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetTokenExpiry
        }
      });

      logger.info('Password reset requested', { userId: user.id, email });

      // TODO: Send reset email
      // await this.sendPasswordResetEmail(email, resetToken);

      return {
        success: true,
        message: 'If an account with this email exists, you will receive reset instructions.'
      };

    } catch (error) {
      logger.error('Password reset request failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Reset password using reset token
   * @param {string} resetToken - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Reset result
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: resetToken,
          passwordResetExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          passwordChangedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Invalidate all refresh tokens
      await prisma.refreshToken.updateMany({
        where: {
          userId: user.id,
          isActive: true
        },
        data: {
          isActive: false,
          revokedAt: new Date()
        }
      });

      logger.info('Password reset completed', { userId: user.id });

      return {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.'
      };

    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }

  // Helper methods

  /**
   * Generate access and refresh tokens
   */
  generateTokens(user, accessTokenExpiry = this.JWT_EXPIRES_IN) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: accessTokenExpiry
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' }, 
      this.JWT_REFRESH_SECRET, 
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Create refresh token record
   */
  async createRefreshToken(userId, refreshToken, rememberMe = false) {
    const expiresAt = new Date(Date.now() + this.parseTokenExpiry(this.JWT_REFRESH_EXPIRES_IN));
    
    // If remember me, extend expiry to 30 days
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 23); // Add 23 more days (7 + 23 = 30)
    }

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
        isActive: true,
        createdAt: new Date()
      }
    });
  }

  /**
   * Parse token expiry string to milliseconds
   */
  parseTokenExpiry(expiry) {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // Default 1 hour
    }
  }

  /**
   * Remove sensitive data from user object
   */
  sanitizeUser(user) {
    const { password, passwordResetToken, passwordResetExpires, emailVerificationToken, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[^A-Za-z0-9])/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    // Check for common weak patterns
    const commonPasswords = ['password', '12345678', 'qwerty123', 'abc123456'];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
      throw new Error('Password is too common. Please choose a more unique password.');
    }
  }

  /**
   * Rate limiting for login attempts
   */
  isRateLimited(clientId) {
    const attempts = this.loginAttempts.get(clientId);
    if (!attempts) return false;

    const now = Date.now();
    const timeSinceLastAttempt = now - attempts.lastAttempt;

    if (attempts.count >= this.MAX_LOGIN_ATTEMPTS && timeSinceLastAttempt < this.LOCKOUT_DURATION) {
      return true;
    }

    return false;
  }

  recordLoginAttempt(clientId, success) {
    if (success) {
      this.loginAttempts.delete(clientId);
    } else {
      const attempts = this.loginAttempts.get(clientId) || { count: 0, lastAttempt: 0 };
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
      this.loginAttempts.set(clientId, attempts);
    }
  }

  clearLoginAttempts(clientId) {
    this.loginAttempts.delete(clientId);
  }

  /**
   * Cleanup expired tokens and sessions
   */
  async cleanupExpiredTokens() {
    try {
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isActive: false }
          ]
        }
      });

      logger.info('Expired tokens cleaned up');
    } catch (error) {
      logger.error('Token cleanup failed', { error: error.message });
    }
  }
}

export default new AuthService();