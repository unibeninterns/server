import crypto from 'crypto';
import User from '../model/user.model.js';
import tokenService from '../services/token.service.js';
import emailService from '../services/email.service.js';
import { BadRequestError, UnauthorizedError } from '../utils/customErrors.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
import generateSecurePassword from '../utils/passwordGenerator.js';

class AuthController {
  // Complete profile from invitation
  completeProfile = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { name, faculty, bio, title } = req.body;
    const profilePicture = req.file
      ? `http://localhost:3000/uploads/profiles/${req.file.filename}`
      : null;

    logger.info(
      `Profile completion attempt with token: ${token.substring(0, 8)}...`
    );

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      inviteToken: hashedToken,
      inviteTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      logger.warn(
        `Invalid or expired token attempt: ${token.substring(0, 8)}...`
      );
      throw new BadRequestError('Invalid or expired invitation token');
    }

    // Generate a random password for the user
    const generatedPassword = generateSecurePassword();

    // Update user profile
    user.name = name;
    user.faculty = faculty;
    user.bio = bio;
    user.title = title;
    user.profilePicture = profilePicture;
    user.password = generatedPassword;
    user.isActive = true;
    user.invitationStatus = 'accepted';
    user.inviteToken = undefined;

    await user.save();
    logger.info(`Profile completed for user: ${user.email}`);

    // Send login credentials to the researcher
    await emailService.sendCredentialsEmail(user.email, generatedPassword);
    logger.info(`Login credentials sent to: ${user.email}`);

    res.status(200).json({
      success: true,
      message:
        'Profile completed successfully. Login credentials have been sent to your email.',
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
      role: user.role,
    });

    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save();
    logger.info(user);

    tokenService.setRefreshTokenCookie(res, tokens.refreshToken);
    logger.info(`Admin login successful for: ${email}`);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });

  // Researcher login
  researcherLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.info(`Researcher login attempt for email: ${email}`);

    // Find user and check password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn(`No account found for email: ${email}`);
      throw new UnauthorizedError('No account found with this email address');
    }

    if (user.role !== 'researcher') {
      logger.warn(`Non-researcher user attempted researcher login: ${email}`);
      throw new UnauthorizedError('Access denied: Researcher account required');
    }

    if (!user.isActive) {
      logger.warn(`Inactive user attempted login: ${email}`);
      throw new UnauthorizedError(
        'Your account is not active. Please complete your profile first.'
      );
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      logger.warn(`Incorrect password attempt for researcher: ${email}`);
      throw new UnauthorizedError('Incorrect password');
    }

    const tokens = tokenService.generateTokens({
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save();

    tokenService.setRefreshTokenCookie(res, tokens.refreshToken);
    logger.info(`Researcher login successful for: ${email}`);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        faculty: user.faculty,
        title: user.title,
        profilePicture: user.profilePicture,
      },
    });
  });

  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      logger.warn('Refresh token attempt without token');
      throw new UnauthorizedError('Refresh token required');
    }

    logger.info(
      `Refresh token attempt with token: ${refreshToken.substring(0, 8)}...`
    );

    const payload = await tokenService.verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId).select('+refreshToken');
    logger.info(user, refreshToken, user.refreshToken);

    if (!user || user.refreshToken !== refreshToken) {
      logger.warn(
        `Invalid refresh token attempt for user ID: ${payload.userId}`
      );
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokens = await tokenService.rotateRefreshToken(refreshToken, {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    user.refreshToken = tokens.refreshToken;
    await user.save();

    tokenService.setRefreshTokenCookie(res, tokens.refreshToken);
    logger.info(`Token refreshed successfully for user: ${user.email}`);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
    });
  });

  verifyToken = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    logger.info(`Token verification request for user ID: ${userId}`);

    const user = await User.findById(userId);
    if (!user) {
      logger.warn(
        `Token verification failed: User not found with ID ${userId}`
      );
      throw new UnauthorizedError('User not found');
    }

    logger.info(`Token verified successfully for user: ${user.email}`);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        faculty: user.faculty,
        title: user.title,
        profilePicture: user.profilePicture,
      },
    });
  });

  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      logger.debug(
        `Logout request with token: ${refreshToken.substring(0, 8)}...`
      );
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
