import express from 'express';
import researcherProfileController from '../controllers/researcher.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get own profile (for researcher)
router.get(
  '/profile',
  authenticateToken,
  researcherProfileController.getProfile
);

// Get specific researcher profile (admin can view any, researcher only their own)
router.get(
  '/profile/:id',
  authenticateToken,
  researcherProfileController.getProfile
);

// Get researcher's popular articles
router.get(
  '/popular-articles',
  authenticateToken,
  researcherProfileController.getPopularArticles
);
router.get(
  '/popular-articles/:id',
  authenticateToken,
  researcherProfileController.getPopularArticles
);

// Get researcher's analytics
router.get(
  '/analytics',
  authenticateToken,
  researcherProfileController.getArticlesAnalytics
);
router.get(
  '/analytics/:id',
  authenticateToken,
  researcherProfileController.getArticlesAnalytics
);

export default router;
