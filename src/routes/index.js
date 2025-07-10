import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import researcherRoutes from './researcher.routes.js';
import featureRoutes from '../Articles/routes/index.js';
import infoRoutes from '../Info/routes/index.js';

const router = Router();

// Mount route groups
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/researcher', researcherRoutes);
router.use('/', featureRoutes);
router.use('/', infoRoutes);

// Root route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Research Portal API is running',
  });
});

export default router;
