import express from 'express';
import articleViewController from '../controllers/articleView.controller.js';
import {
  authenticateToken,
  authenticateAdminToken,
} from '../../middleware/auth.middleware.js';

const router = express.Router();

// Public route to record a view
router.post('/:id/view', articleViewController.recordView);

// Get popular articles - public
router.get('/popular', articleViewController.getPopularArticles);

// Protected route for view statistics - admin and researchers only
router.get(
  '/:id/stats',
  authenticateToken,
  articleViewController.getArticleViewStats
);

export default router;
