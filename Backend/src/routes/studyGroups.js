import express from 'express';
import studyGroupController from '../controllers/studyGroupController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Study group routes
router.post('/', studyGroupController.createStudyGroup);
router.get('/', studyGroupController.getStudyGroups);
router.get('/my-groups', studyGroupController.getUserStudyGroups);
router.get('/:id', studyGroupController.getStudyGroup);
router.put('/:id', studyGroupController.updateStudyGroup);
router.delete('/:id', studyGroupController.deleteStudyGroup);
router.post('/:id/join', studyGroupController.joinStudyGroup);
router.post('/:id/leave', studyGroupController.leaveStudyGroup);

// Session management
router.post('/:id/sessions', studyGroupController.scheduleSession);
router.post('/:id/sessions/:sessionId/join', studyGroupController.joinSession);
router.post('/:id/sessions/:sessionId/end', studyGroupController.endSession);
router.get('/:id/sessions/:sessionId', studyGroupController.getSession);
router.post('/sessions/join-by-code', studyGroupController.joinSessionByCode);

// Chat functionality
router.post('/:id/chat', studyGroupController.sendChatMessage);
router.get('/:id/chat', studyGroupController.getChatMessages);

export default router;