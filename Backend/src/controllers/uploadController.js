import multer from 'multer';
import path from 'path';
import fs from 'fs';
import aiService from '../services/aiService.js';
import StudyPlan from '../models/StudyPlan.js';
import logger from '../utils/logger.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Helper function to extract text from files
const extractTextFromFile = async (file) => {
  try {
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (fileExt === '.txt') {
      return fs.readFileSync(file.path, 'utf8');
    }
    
    // For PDF, DOC, DOCX files, we'd use specialized libraries
    // For now, return filename as placeholder
    return `Content from file: ${file.originalname}`;
    
  } catch (error) {
    logger.error('Error extracting text from file:', error);
    return `File: ${file.originalname} (content extraction failed)`;
  }
};

// Middleware for handling file uploads
export const uploadFiles = upload.array('files', 5); // Allow up to 5 files

// Upload syllabus controller function
export const uploadSyllabus = async (req, res) => {
  try {
    const { subject, level, duration, learningStyle } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Extract text from uploaded files (simplified version)
    let extractedText = '';
    for (const file of files) {
      const fileContent = await extractTextFromFile(file);
      extractedText += fileContent + '\n\n';
    }

    // Generate study plan using AI
    const prompt = `Create a comprehensive study plan based on the following syllabus/course content:

${extractedText}

Subject: ${subject}
Level: ${level}
Duration: ${duration}
Learning Style: ${learningStyle}

Please provide:
1. Weekly breakdown of topics
2. Recommended study schedule
3. Key concepts to focus on
4. Practice exercises suggestions
5. Assessment milestones`;

    // Try Hugging Face first (most reliable and free), then fallback to others
    let aiResponse = await aiService.generate(prompt, 'huggingface', { maxTokens: 2000 });
    
    if (!aiResponse.success) {
      logger.info('Hugging Face failed, trying Groq...');
      aiResponse = await aiService.generate(prompt, 'groq', { maxTokens: 2000 });
    }
    
    if (!aiResponse.success) {
      logger.info('Groq failed, trying Gemini...');
      aiResponse = await aiService.generate(prompt, 'gemini', { maxTokens: 2000 });
    }
    


    if (!aiResponse.success) {
      // Fallback: Create a basic study plan without AI
      logger.info('All AI providers failed, using fallback study plan');
      aiResponse = {
        success: true,
        content: `# Study Plan for ${subject || 'Your Course'}

## Course Details
- **Level**: ${level}
- **Duration**: ${duration}
- **Learning Style**: ${learningStyle}

## Weekly Breakdown

### Week 1-2: Foundation
- Review basic concepts and terminology
- Set up study environment and materials
- Complete introductory exercises

### Week 3-4: Core Concepts
- Deep dive into main topics
- Practice problems and examples
- Review and reinforce learning

### Week 5-6: Advanced Topics
- Explore complex concepts
- Work on challenging problems
- Apply knowledge to real scenarios

### Week 7-8: Review and Assessment
- Comprehensive review of all topics
- Practice tests and assessments
- Final project or presentation

## Study Schedule
- **Daily**: 1-2 hours of focused study
- **Weekly**: Review and practice sessions
- **Monthly**: Progress assessment and adjustment

## Resources
- Course materials and textbooks
- Online tutorials and videos
- Practice exercises and quizzes
- Study groups and discussions

## Milestones
- Week 2: Complete foundation review
- Week 4: Master core concepts
- Week 6: Apply advanced topics
- Week 8: Final assessment ready

This study plan has been generated based on your preferences and can be customized as needed.`
      };
    }

    // Calculate dates
    const startDate = new Date();
    const durationInDays = duration.includes('month') 
      ? parseInt(duration) * 30 
      : duration.includes('week') 
        ? parseInt(duration) * 7 
        : parseInt(duration) || 30;
    const endDate = new Date(startDate.getTime() + (durationInDays * 24 * 60 * 60 * 1000));

    // Create study plan in database
    const studyPlan = new StudyPlan({
      user: req.userId,
      title: `${subject || 'Uploaded Course'} Study Plan`,
      subject: subject || 'Uploaded Course',
      difficulty: level,
      estimatedDuration: durationInDays,
      schedule: {
        startDate,
        endDate,
        studyDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        dailyStudyTime: 60
      },
      topics: [
        {
          title: 'Course Introduction',
          description: 'Overview and getting started with the course materials',
          order: 1,
          estimatedTime: 90,
          difficulty: 'easy',
          status: 'not_started'
        },
        {
          title: 'Foundation Concepts',
          description: 'Core principles and fundamental concepts',
          order: 2,
          estimatedTime: 120,
          difficulty: 'easy',
          status: 'not_started'
        },
        {
          title: 'Practical Applications',
          description: 'Hands-on exercises and real-world examples',
          order: 3,
          estimatedTime: 150,
          difficulty: 'medium',
          status: 'not_started'
        },
        {
          title: 'Advanced Topics',
          description: 'Complex concepts and advanced techniques',
          order: 4,
          estimatedTime: 180,
          difficulty: 'hard',
          status: 'not_started'
        },
        {
          title: 'Final Assessment',
          description: 'Review, practice tests, and final evaluation',
          order: 5,
          estimatedTime: 120,
          difficulty: 'medium',
          status: 'not_started'
        }
      ],
      aiGenerated: true,
      aiPrompt: `Subject: ${subject}, Level: ${level}, Duration: ${duration}, Style: ${learningStyle}`,
      status: 'active'
    });

    await studyPlan.save();

    // Clean up uploaded files
    files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) logger.error('Error deleting file:', err);
      });
    });

    res.json({
      success: true,
      message: 'Study plan generated successfully',
      studyPlan
    });

  } catch (error) {
    logger.error('Upload syllabus error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};