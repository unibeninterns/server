import { Router } from 'express';
import infoRoutes from './info.routes.js';
import infoViewRoutes from './infoView.route.js';

const router = Router();

router.use('/info', infoRoutes);
router.use('/info-views', infoViewRoutes);

export default router;
