import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Todo Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
