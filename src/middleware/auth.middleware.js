import { UnauthorizedError, ForbiddenError } from '../utils/customErrors.js';
import tokenService from '../services/token.service.js';
import User from '../model/user.model.js';

// Authenticate admin access token
const authenticateAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = await tokenService.verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenError('Access denied: Admin privileges required');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Authenticate researcher access token
const authenticateResearcherToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = await tokenService.verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.role !== 'researcher') {
      throw new ForbiddenError('Access denied: Researcher privileges required');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account is not active');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Authenticate any valid user (admin or researcher)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = await tokenService.verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!['admin', 'researcher'].includes(user.role)) {
      throw new ForbiddenError('Invalid user role');
    }

    if (user.role === 'researcher' && !user.isActive) {
      throw new UnauthorizedError('Your account is not active');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Check article moderation permissions
const authorizeModeration = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new ForbiddenError('Access denied: Admin privileges required');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting middleware for comments and public endpoints
const rateLimiter = (limit, windowMs) => {
  const requests = new Map();
  
  return (req, res, next) => {
    try {
      const ip = req.ip;
      const now = Date.now();
      
      // Clean old requests
      if (requests.has(ip)) {
        const userRequests = requests.get(ip);
        const validRequests = userRequests.filter((timestamp) => 
          now - timestamp < windowMs
        );
        
        if (validRequests.length >= limit) {
          throw new UnauthorizedError('Rate limit exceeded');
        }
        
        requests.set(ip, [...validRequests, now]);
      } else {
        requests.set(ip, [now]);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export {
  authenticateAdminToken,
  authenticateResearcherToken,
  authenticateToken,
  authorizeModeration,
  rateLimiter
};