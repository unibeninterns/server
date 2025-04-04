import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/customErrors.js';
import validateEnv from '../utils/validateEnv.js';

validateEnv();

// Schema for blacklisted tokens
const BlacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0
  }
});

const BlacklistedToken = mongoose.model('BlacklistedToken', BlacklistedTokenSchema, 'BlacklistedTokens');

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
        exp: now + 15 * 60 // 15 minutes
      },
      this.accessTokenSecret
    );

    const refreshToken = jwt.sign(
      {
        ...payload,
        iat: now,
        exp: now + 7 * 24 * 60 * 60 // 7 days
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
      const isBlacklisted = await BlacklistedToken.exists({ token });
      if (isBlacklisted) {
        throw new UnauthorizedError('Token has been revoked');
      }

      return jwt.verify(token, this.refreshTokenSecret);
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async blacklistToken(token, expiresAt) {
    await BlacklistedToken.create({
      token,
      expiresAt
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
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  clearRefreshTokenCookie(res) {
    res.clearCookie('refreshToken');
  }
}

export default new TokenService();