import express from 'express';
import aiController from '../controllers/aiController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Chat and conversations
router.post('/chat', aiController.chat);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id', aiController.getConversation);
router.delete('/conversations/:id', aiController.deleteConversation);

// AI Agents
router.post('/agents', aiController.createAgent);
router.get('/agents', aiController.getAgents);
router.put('/agents/:id', aiController.updateAgent);

// Health check
router.get('/health', aiController.healthCheck);

export default router;