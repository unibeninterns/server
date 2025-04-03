import crypto from 'crypto';
import User from '../models/user.model.js';
import tokenService from '../services/token.service.js';
import emailService from '../services/email.service.js';
import { BadRequestError, UnauthorizedError } from '../utils/customErrors.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

class AuthController {
  // Admin invite method for inviting researchers/lecturers
  inviteResearcher = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    logger.info(`Invitation request received for email: ${email}`);
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn(`Attempt to invite already registered email: ${email}`);
      throw new BadRequestError('Email already registered');
    }
    
    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(inviteToken)
      .digest('hex');
    
    // Store invitation
    const invitation = {
      email,
      inviteToken: hashedToken,
      inviteTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
    // Save invitation to database
    await User.create({
      email,
      inviteToken: hashedToken,
      inviteTokenExpires: invitation.inviteTokenExpires,
      role: 'researcher',
      isActive: false
    });
    
    logger.info(`Created invitation record for email: ${email}`);
    
    // Send invitation email
    await emailService.sendInvitationEmail(email, inviteToken);
    logger.info(`Invitation email sent to: ${email}`);
    
    res.status(200).json({
      success: true,
      message: 'Invitation sent successfully'
    });
  });
  
  // Complete profile from invitation
  completeProfile = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { name, faculty, title } = req.body;
    const profilePicture = req.file ? req.file.path : null;
    
    logger.info(`Profile completion attempt with token: ${token.substring(0, 8)}...`);
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      inviteToken: hashedToken,
      inviteTokenExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      logger.warn(`Invalid or expired token attempt: ${token.substring(0, 8)}...`);
      throw new BadRequestError('Invalid or expired invitation token');
    }
    
    // Update user profile
    user.name = name;
    user.faculty = faculty;
    user.title = title;
    user.profilePicture = profilePicture;
    user.isActive = true;
    user.inviteToken = undefined;
    user.inviteTokenExpires = undefined;
    
    await user.save();
    logger.info(`Profile completed for user: ${user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'Profile completed successfully'
    });
  });

  // Admin login
  adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.info(`Admin login attempt for email: ${email}`);
    
    // Find user and check password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn(`No admin account found for email: ${email}`);
      throw new UnauthorizedError('No account found with this email address');
    }
    
    if (user.role !== 'admin') {
      logger.warn(`Non-admin user attempted admin login: ${email}`);
      throw new UnauthorizedError('Access denied: Admin privileges required');
    }
    
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      logger.warn(`Incorrect password attempt for admin: ${email}`);
      throw new UnauthorizedError('Incorrect password');
    }

    const tokens = tokenService.generateTokens({
      userId: String(user._id),
      email: user.email,
      role: user.role
    });

    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save();

    tokenService.setRefreshTokenCookie(res, tokens.refreshToken);
    logger.info(`Admin login successful for: ${email}`);
    
    res.json({
      success: true,
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });

  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      logger.warn('Refresh token attempt without token');
      throw new UnauthorizedError('Refresh token required');
    }

    logger.debug(`Refresh token attempt with token: ${refreshToken.substring(0, 8)}...`);
    
    const payload = await tokenService.verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);

    if (!user || user.refreshToken !== refreshToken) {
      logger.warn(`Invalid refresh token attempt for user ID: ${payload.userId}`);
      throw new UnauthorizedError('Invalid refresh token');
    }
    
    const tokens = await tokenService.rotateRefreshToken(refreshToken, {
      userId: String(user._id),
      email: user.email,
      role: user.role
    });

    user.refreshToken = tokens.refreshToken;
    await user.save();

    tokenService.setRefreshTokenCookie(res, tokens.refreshToken);
    logger.info(`Token refreshed successfully for user: ${user.email}`);
    
    res.json({
      success: true,
      accessToken: tokens.accessToken
    });
  });

  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      logger.debug(`Logout request with token: ${refreshToken.substring(0, 8)}...`);
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = undefined;
        await user.save();
        logger.info(`User logged out: ${user.email}`);
      }
    }

    tokenService.clearRefreshTokenCookie(res);
  
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  });
}

export default new AuthController();