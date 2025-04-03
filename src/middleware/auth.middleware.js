import { UnauthorizedError, ForbiddenError } from '../utils/customErrors';
import tokenService from '../services/token.service';
import User from '../models/user.model';

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
    authorizeModeration,
    rateLimiter
  };