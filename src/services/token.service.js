import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/customErrors.js';
import validateEnv from '../utils/validateEnv.js';
import logger from '../utils/logger.js';

validateEnv();

// Schema for blacklisted tokens
const BlacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
});

const BlacklistedToken = mongoose.model(
  'BlacklistedToken',
  BlacklistedTokenSchema,
  'BlacklistedTokens'
);

class TokenService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets must be defined in environment variables');
    }
  }

  generateTokens(payload) {
    const now = Math.floor(Date.now() / 1000);

    const accessToken = jwt.sign(
      {
        ...payload,
        iat: now,
        exp: now + 15 * 60, // 15 minutes
      },
      this.accessTokenSecret
    );

    const refreshToken = jwt.sign(
      {
        ...payload,
        iat: now,
        exp: now + 7 * 24 * 60 * 60, // 7 days
      },
      this.refreshTokenSecret
    );

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret);
    } catch (error) {
      throw new UnauthorizedError('Invalid access token');
    }
  }

  async verifyRefreshToken(token) {
    try {
      logger.info('Verifying refresh token:', token.substring(0, 8) + '...');
      const isBlacklisted = await BlacklistedToken.exists({ token });
      if (isBlacklisted) {
        logger.error('Token is blacklisted');
        throw new UnauthorizedError('Token has been revoked');
      }

      const decoded = jwt.verify(token, this.refreshTokenSecret);
      logger.info('Token verified successfully for user:', decoded);
      return decoded;
    } catch (error) {
      logger.error('Token verification failed:', error.message);
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async blacklistToken(token, expiresAt) {
    await BlacklistedToken.create({
      token,
      expiresAt,
    });
  }

  async rotateRefreshToken(oldToken, payload) {
    const tokens = this.generateTokens(payload);

    // Blacklist old token
    const decoded = jwt.decode(oldToken);
    if (decoded.exp) {
      await this.blacklistToken(oldToken, new Date(decoded.exp * 1000));
    }

    return tokens;
  }

  setRefreshTokenCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendDomain = new URL(
      process.env.FRONTEND_URL || 'http://localhost:3001'
    ).hostname;

    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // Use 'none' in production to allow cross-site cookies
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: frontendDomain === 'localhost' ? undefined : frontendDomain,
    });
  }

  clearRefreshTokenCookie(res) {
    res.clearCookie('refreshToken');
  }
}

export default new TokenService();
