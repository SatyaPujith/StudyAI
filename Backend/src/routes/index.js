import express from 'express';
import authRoutes from './auth.js';
import studyRoutes from './study.js';
import aiRoutes from './ai.js';
import uploadRoutes from './upload.js';
import studyGroupRoutes from './studyGroups.js';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/study', studyRoutes);
router.use('/ai', aiRoutes);
router.use('/upload', uploadRoutes);
router.use('/study-groups', studyGroupRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;