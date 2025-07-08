import express from 'express';
import infoViewController from '../controllers/infoView.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Public route to record a view
router.post('/:id/view', infoViewController.recordView);

// Get popular info documents - public
router.get('/popular', infoViewController.getPopularInfoDocuments);

// Protected route for view statistics - admin only
router.get(
  '/:id/stats',
  authenticateToken,
  infoViewController.getInfoDocumentViewStats
);

export default router;
