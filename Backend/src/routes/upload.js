import express from 'express';
import { uploadFiles, uploadSyllabus } from '../controllers/uploadController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Upload syllabus and generate study plan
router.post('/syllabus', uploadFiles, uploadSyllabus);

export default router;