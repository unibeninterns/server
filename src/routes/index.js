import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

// Mount route groups
router.use('/auth', authRoutes);

// Root route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Research Portal API is running'
  });
});

export default router;