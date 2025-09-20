import express from 'express';
import studyController from '../controllers/studyController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Study plans
router.post('/plans', studyController.createStudyPlan);
router.get('/plans', studyController.getStudyPlans);
router.put('/plans/:id', studyController.updateStudyPlan);
router.put('/plans/:planId/topics/:topicId', studyController.updateTopicStatus);
router.get('/plans/:planId/topics/:topicId/content', studyController.getStudyContent);

// Quizzes
router.post('/quizzes', studyController.createQuiz);
router.get('/quizzes', studyController.getQuizzes);
router.post('/quiz-attempts', studyController.submitQuizAttempt);
router.get('/quiz-attempts', studyController.getQuizAttempts);

// AI-powered features
router.post('/explain-concept', studyController.explainConcept);
router.post('/generate-flashcards', studyController.generateFlashcards);

// Progress tracking
router.post('/progress/start', studyController.startStudySession);
router.post('/progress/end', studyController.endStudySession);
router.post('/progress/section', studyController.trackSectionCompletion);
router.get('/progress/stats', studyController.getUserStats);

export default router;