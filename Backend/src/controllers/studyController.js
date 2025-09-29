import StudyPlan from '../models/StudyPlan.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import UserProgress from '../models/UserProgress.js';
import aiService from '../services/aiService.js';
import logger from '../utils/logger.js';

class StudyController {
  async createStudyPlan(req, res) {
    try {
      const { subject, level, duration, learningStyle, goals } = req.body;

      logger.info(`Creating study plan for ${subject} (${duration})`);

      // Calculate dates
      const startDate = new Date();
      const durationInDays = this.parseDuration(duration);
      const endDate = new Date(startDate.getTime() + (durationInDays * 24 * 60 * 60 * 1000));

      const studyPlan = new StudyPlan({
        user: req.userId,
        title: `${subject} - ${duration} Study Plan`,
        subject,
        difficulty: level,
        estimatedDuration: durationInDays,
        schedule: {
          startDate,
          endDate,
          studyDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          dailyStudyTime: 60
        },
        topics: [{
          title: 'Getting Started',
          description: 'Introduction and overview',
          order: 1,
          estimatedTime: 60,
          difficulty: 'easy',
          status: 'not_started'
        }],
        aiGenerated: true,
        aiPrompt: `Subject: ${subject}, Level: ${level}, Duration: ${duration}, Style: ${learningStyle}`,
        status: 'active'
      });

      // Attempt AI detailed plan generation
      let aiResult;
      try {
        aiResult = await aiService.generateDetailedStudyPlan(subject, level, duration, learningStyle);
      } catch (err) {
        logger.error('AI detailed plan generation threw error:', err);
        aiResult = { success: false };
      }

      // Map AI result into dailyContent
      let planArray = [];
      if (aiResult?.success && aiResult.content) {
        try {
          const raw = aiResult.content;
          planArray = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (parseErr) {
          logger.error('Failed to parse AI study plan JSON, falling back:', parseErr);
        }
      }

      if (!Array.isArray(planArray) || planArray.length === 0) {
        // Fallback structured plan from AI service
        planArray = aiService.generateFallbackStudyPlan(subject, level, durationInDays, learningStyle);
      }

      // Build dailyContent entries
      const dailyContent = planArray.map((dayItem) => {
        const dayNum = dayItem.day || planArray.indexOf(dayItem) + 1;
        const date = new Date(startDate.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000);
        const content = dayItem.content || {
          overview: dayItem.overview || '',
          keyPoints: dayItem.keyPoints || [],
          examples: dayItem.examples || [],
          exercises: dayItem.exercises || []
        };
        return {
          day: dayNum,
          date,
          title: dayItem.title || `Day ${dayNum}: ${subject}`,
          objectives: dayItem.objectives || [],
          content,
          resources: dayItem.resources || [],
          activities: dayItem.activities || [],
          assessment: dayItem.assessment || [],
          homework: dayItem.homework || '',
          totalTime: dayItem.totalTime || 90
        };
      });

      studyPlan.dailyContent = dailyContent;

      await studyPlan.save();

      res.status(201).json({
        success: true,
        message: 'Study plan created successfully',
        studyPlan
      });
    } catch (error) {
      logger.error('Create study plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getStudyPlans(req, res) {
    try {
      logger.info(`Getting study plans for user: ${req.userId}`);
      const studyPlans = await StudyPlan.find({ user: req.userId })
        .sort({ createdAt: -1 });

      logger.info(`Found ${studyPlans.length} study plans`);
      res.json({
        success: true,
        studyPlans
      });
    } catch (error) {
      logger.error('Get study plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateStudyPlan(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const studyPlan = await StudyPlan.findOneAndUpdate(
        { _id: id, user: req.userId },
        updates,
        { new: true }
      );

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Study plan updated successfully',
        studyPlan
      });
    } catch (error) {
      logger.error('Update study plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateTopicStatus(req, res) {
    try {
      const { planId, topicId } = req.params;
      const { status } = req.body;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      // Find and update the topic
      const topic = studyPlan.topics.id(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      topic.status = status;
      if (status === 'completed') {
        topic.completedAt = new Date();
      }

      // Update progress
      await studyPlan.updateProgress();
      await studyPlan.save();

      res.json({
        success: true,
        message: 'Topic status updated successfully',
        studyPlan
      });
    } catch (error) {
      logger.error('Update topic status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async generateTopicContent(req, res) {
    try {
      const { planId, topicId } = req.params;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      // Check if this is a daily content request (topicId is actually day number)
      const dayNumber = parseInt(topicId);
      if (!isNaN(dayNumber) && studyPlan.dailyContent && studyPlan.dailyContent.length > 0) {
        const dailyContent = studyPlan.dailyContent.find(day => day.day === dayNumber);
        if (dailyContent) {
          return res.json({
            success: true,
            content: dailyContent.content
          });
        }
      }

      // Fallback to topic-based content
      const topic = studyPlan.topics && studyPlan.topics.id ? studyPlan.topics.id(topicId) : null;
      if (!topic && isNaN(dayNumber)) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      // If we have a topic, generate content for it
      let content;
      if (topic) {
        const prompt = `Create comprehensive learning content for the topic "${topic.title}" in the subject "${studyPlan.subject}".

Topic Description: ${topic.description}
Difficulty Level: ${topic.difficulty}
Subject: ${studyPlan.subject}
Course Level: ${studyPlan.difficulty}

Please provide detailed educational content with overview, key points, examples, and exercises.`;

        // Try to generate with AI
        let aiResponse = await aiService.generate(prompt, 'gemini', { maxTokens: 3000 });

        if (aiResponse.success) {
          content = this.parseAIContent(aiResponse.content, topic);
        } else {
          content = this.generateFallbackContent(topic, studyPlan);
        }
      } else {
        // Generate content for day number when no specific topic found
        const dayTitle = `Day ${dayNumber}: ${studyPlan.subject} Study`;
        content = {
          overview: `Welcome to day ${dayNumber} of your ${studyPlan.subject} study plan! Today's session will help you build a strong foundation in ${studyPlan.subject} concepts and develop practical skills.`,
          keyPoints: [
            `Fundamental concept ${dayNumber} in ${studyPlan.subject}`,
            `Key principle for ${studyPlan.subject} understanding`,
            `Practical application of ${studyPlan.subject} knowledge`,
            `Important ${studyPlan.subject} technique for ${studyPlan.difficulty} level`,
            `Advanced ${studyPlan.subject} concepts and best practices`
          ],
          examples: [
            `Example: Basic ${studyPlan.subject} concept demonstration with step-by-step explanation`,
            `Example: Real-world ${studyPlan.subject} application in practice`,
            `Example: Step-by-step ${studyPlan.subject} problem solving scenario`,
            `Example: Advanced ${studyPlan.subject} implementation with detailed walkthrough`
          ],
          exercises: [
            `Practice: Apply ${studyPlan.subject} fundamentals to solve basic problems`,
            `Exercise: Implement ${studyPlan.subject} concepts in a practical scenario`,
            `Activity: Create your own examples using ${studyPlan.subject} principles`,
            `Challenge: Solve advanced problems with ${studyPlan.subject} techniques`
          ],
          resources: [
            {
              type: 'article',
              title: `${studyPlan.subject} Comprehensive Guide`,
              description: `In-depth article covering all aspects of ${studyPlan.subject}`
            },
            {
              type: 'practice',
              title: `${studyPlan.subject} Practice Exercises`,
              description: `Interactive exercises to master ${studyPlan.subject}`
            },
            {
              type: 'video',
              title: `${studyPlan.subject} Video Tutorial`,
              description: `Comprehensive video tutorial for ${studyPlan.subject} concepts`
            }
          ]
        };
      }

      res.json({
        success: true,
        content
      });
    } catch (error) {
      logger.error('Generate topic content error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  parseAIContent(aiContent, topic) {
    // Parse AI response into structured format
    const sections = {
      overview: '',
      keyPoints: [],
      examples: [],
      exercises: [],
      resources: []
    };

    try {
      const lines = aiContent.split('\n');
      let currentSection = '';
      let currentContent = '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('OVERVIEW:')) {
          currentSection = 'overview';
          currentContent = '';
        } else if (trimmedLine.startsWith('KEY_POINTS:')) {
          if (currentSection === 'overview') sections.overview = currentContent.trim();
          currentSection = 'keyPoints';
          currentContent = '';
        } else if (trimmedLine.startsWith('EXAMPLES:')) {
          if (currentSection === 'keyPoints') this.parseListItems(currentContent, sections.keyPoints);
          currentSection = 'examples';
          currentContent = '';
        } else if (trimmedLine.startsWith('EXERCISES:')) {
          if (currentSection === 'examples') this.parseListItems(currentContent, sections.examples);
          currentSection = 'exercises';
          currentContent = '';
        } else if (trimmedLine.startsWith('RESOURCES:')) {
          if (currentSection === 'exercises') this.parseListItems(currentContent, sections.exercises);
          currentSection = 'resources';
          currentContent = '';
        } else if (trimmedLine) {
          currentContent += line + '\n';
        }
      }

      // Handle the last section
      if (currentSection === 'resources') {
        this.parseResources(currentContent, sections.resources);
      }

    } catch (error) {
      logger.error('Error parsing AI content:', error);
    }

    // Ensure we have content even if parsing fails
    if (!sections.overview) {
      sections.overview = `Welcome to the comprehensive study of ${topic.title}. This topic is fundamental to understanding ${topic.description}. Through this lesson, you'll gain deep insights into the core concepts, see practical applications, and develop hands-on skills that will serve as a foundation for more advanced topics.`;
    }

    return sections;
  }

  parseListItems(content, targetArray) {
    const items = content.split('\n').filter(line => line.trim());
    items.forEach(item => {
      if (item.trim()) {
        targetArray.push(item.trim().replace(/^[-*•]\s*/, ''));
      }
    });
  }

  parseResources(content, targetArray) {
    const items = content.split('\n').filter(line => line.trim());
    items.forEach(item => {
      if (item.trim()) {
        const cleanItem = item.trim().replace(/^[-*•]\s*/, '');
        const resourceType = this.detectResourceType(cleanItem);
        targetArray.push({
          type: resourceType,
          title: cleanItem.substring(0, 50) + (cleanItem.length > 50 ? '...' : ''),
          description: cleanItem
        });
      }
    });
  }

  detectResourceType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('video') || lower.includes('tutorial') || lower.includes('youtube')) return 'video';
    if (lower.includes('article') || lower.includes('blog') || lower.includes('reading')) return 'article';
    if (lower.includes('book') || lower.includes('documentation') || lower.includes('manual')) return 'book';
    if (lower.includes('practice') || lower.includes('exercise') || lower.includes('hands-on')) return 'practice';
    if (lower.includes('quiz') || lower.includes('test') || lower.includes('assessment')) return 'quiz';
    return 'article';
  }

  generateFallbackContent(topic, studyPlan) {
    return {
      overview: `Welcome to the comprehensive study of ${topic.title}. This topic is a crucial component of ${studyPlan.subject} and will provide you with essential knowledge and skills. In this detailed lesson, you'll explore the fundamental concepts, understand the practical applications, and develop hands-on experience through various exercises and examples. This ${topic.difficulty} level content is designed to build your expertise systematically, ensuring you gain both theoretical understanding and practical competency. By the end of this study session, you'll have a solid foundation that prepares you for more advanced topics and real-world applications.`,

      keyPoints: [
        `Understanding the fundamental definition and scope of ${topic.title}`,
        `Exploring the historical context and evolution of these concepts`,
        `Identifying key principles and underlying theories`,
        `Recognizing patterns and relationships within the subject matter`,
        `Learning standard terminology and professional vocabulary`,
        `Understanding common applications and use cases`,
        `Identifying potential challenges and how to overcome them`,
        `Connecting this topic to broader concepts in ${studyPlan.subject}`,
        `Developing analytical and critical thinking skills`,
        `Preparing for practical implementation and real-world scenarios`
      ],

      examples: [
        `Real-world application: How ${topic.title} is used in professional ${studyPlan.subject} environments, including specific scenarios and outcomes`,
        `Case study analysis: Detailed examination of a successful implementation, including challenges faced and solutions applied`,
        `Step-by-step walkthrough: Complete process demonstration from initial concept to final result with detailed explanations`,
        `Comparative analysis: Examining different approaches to the same problem and understanding when to use each method`,
        `Problem-solving scenario: Complex situation requiring application of multiple concepts with guided solution process`
      ],

      exercises: [
        `Foundational practice: Complete basic exercises to reinforce core concepts and build confidence`,
        `Applied problem solving: Work through realistic scenarios that mirror professional challenges`,
        `Creative application: Design your own solution using the principles learned in this topic`,
        `Analytical exercise: Evaluate existing solutions and identify areas for improvement`,
        `Synthesis project: Combine multiple concepts to create a comprehensive solution`,
        `Peer collaboration: Work with others to solve complex problems and share different perspectives`
      ],

      resources: [
        { type: 'video', title: 'Comprehensive Video Tutorial', description: 'In-depth video explanation covering all aspects of this topic with visual demonstrations' },
        { type: 'article', title: 'Essential Reading Material', description: 'Detailed article providing theoretical foundation and advanced concepts' },
        { type: 'practice', title: 'Interactive Practice Platform', description: 'Hands-on exercises and simulations to reinforce learning' },
        { type: 'book', title: 'Reference Documentation', description: 'Comprehensive reference material for deep dive into technical details' },
        { type: 'quiz', title: 'Knowledge Assessment', description: 'Self-assessment quiz to test understanding and identify areas for review' },
        { type: 'article', title: 'Industry Best Practices', description: 'Professional guidelines and standards used in real-world applications' }
      ]
    };
  }

  async createQuiz(req, res) {
    try {
      const { topic, difficulty, questionCount = 10, isPublic = true } = req.body;
      
      logger.info(`Creating quiz: ${topic}, ${difficulty}, ${questionCount} questions`);

      // Generate AI quiz questions
      const aiResponse = await aiService.generateQuizQuestions(topic, difficulty, questionCount);

      if (!aiResponse.success) {
        logger.error('AI quiz generation failed:', aiResponse.error);
        // Use fallback questions instead of failing
        logger.info('Using fallback quiz questions');
      }

      let questions;
      
      if (aiResponse.success) {
        try {
          // Try to extract JSON from the response
          let jsonContent = aiResponse.content;
          
          // Look for JSON array in the response
          const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonContent = jsonMatch[0];
          }
          
          questions = JSON.parse(jsonContent);
          
          // Validate that it's an array of questions
          if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Invalid questions format');
          }
          
          logger.info(`Successfully parsed ${questions.length} questions`);
          
        } catch (parseError) {
          logger.error('Failed to parse AI quiz response:', parseError);
          questions = null;
        }
      }
      
      // Use fallback questions if AI failed or parsing failed
      if (!questions) {
        logger.info('Using fallback questions');
        questions = this.generateFallbackQuestions(topic, difficulty, questionCount);
      }

      // Generate a unique access code for private quizzes
      const accessCode = !isPublic ? this.generateUniqueCode() : null;

      const quiz = new Quiz({
        title: `${topic} - ${difficulty} Quiz`,
        topic,
        difficulty,
        questions,
        isPublic,
        accessCode,
        creator: req.userId,
        aiGenerated: aiResponse.success
      });

      await quiz.save();
      
      logger.info(`Quiz created successfully: ${quiz._id}`);

      res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        quiz
      });
    } catch (error) {
      logger.error('Create quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error: ' + error.message
      });
    }
  }
  
  async createManualQuiz(req, res) {
    try {
      const { title, topic, difficulty, questions, isPublic = true } = req.body;
      
      logger.info(`Creating manual quiz: ${title}`);
      
      // Validate required fields
      if (!title || !topic || !difficulty || !questions || !Array.isArray(questions)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields or invalid questions format'
        });
      }
      
      // Validate questions format
      for (const question of questions) {
        if (!question.question || !question.options || !Array.isArray(question.options) || 
            question.correct === undefined || !question.explanation) {
          return res.status(400).json({
            success: false,
            message: 'Invalid question format'
          });
        }
      }
      
      // Generate a unique access code for private quizzes
      const accessCode = !isPublic ? this.generateUniqueCode() : null;
      
      const quiz = new Quiz({
        title,
        topic,
        difficulty,
        questions,
        isPublic,
        accessCode,
        creator: req.userId,
        aiGenerated: false
      });
      
      await quiz.save();
      
      logger.info(`Manual quiz created successfully: ${quiz._id}`);
      
      res.status(201).json({
        success: true,
        message: 'Manual quiz created successfully',
        quiz
      });
    } catch (error) {
      logger.error('Create manual quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error: ' + error.message
      });
    }
  }
  
  // Generate a unique code for private quizzes
  generateUniqueCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }
  
  // Generate fallback questions when AI fails
  generateFallbackQuestions(topic, difficulty, count) {
    const questions = [];
    
    for (let i = 1; i <= count; i++) {
      questions.push({
        question: `What is an important ${difficulty} level concept in ${topic}?`,
        options: [
          `Correct answer about ${topic} concept ${i}`,
          `Incorrect option A for ${topic}`,
          `Incorrect option B for ${topic}`,
          `Incorrect option C for ${topic}`
        ],
        correct: 0,
        explanation: `This is correct because it represents a fundamental ${difficulty} level concept in ${topic} that students need to master.`
      });
    }
    
    return questions;
  }
  
  // Parse duration helper
  parseDuration(duration) {
    if (!duration) return 30;
    
    const durationStr = duration.toLowerCase();
    if (durationStr.includes('month')) {
      const months = parseInt(durationStr) || 1;
      return months * 30;
    } else if (durationStr.includes('week')) {
      const weeks = parseInt(durationStr) || 1;
      return weeks * 7;
    } else if (durationStr.includes('day')) {
      return parseInt(durationStr) || 30;
    } else {
      return parseInt(duration) || 30;
    }
  }
  
  // Create syllabus-based content
  async createSyllabusBasedContent(syllabusText, subject, level, duration) {
    const durationInDays = this.parseDuration(duration);
    const topics = this.extractTopicsFromSyllabus(syllabusText, subject);
    
    const dailyContent = [];
    const topicsPerDay = Math.max(1, Math.ceil(topics.length / durationInDays));
    
    for (let day = 1; day <= durationInDays; day++) {
      const dayTopics = topics.slice((day - 1) * topicsPerDay, day * topicsPerDay);
      const mainTopic = dayTopics[0] || `${subject} Concepts`;
      
      dailyContent.push({
        day,
        title: `Day ${day}: ${mainTopic}`,
        objectives: [
          `Understand ${mainTopic} fundamentals`,
          `Learn key principles and concepts`,
          `Apply knowledge through practical exercises`,
          `Prepare for advanced topics`
        ],
        content: {
          overview: `Today's session focuses on ${mainTopic}. This is a crucial topic in ${subject} that will provide you with essential knowledge and skills. You'll explore the fundamental concepts, understand practical applications, and develop hands-on experience through various exercises.`,
          keyPoints: [
            `Core definition and scope of ${mainTopic}`,
            `Key principles underlying ${mainTopic}`,
            `Common applications and use cases`,
            `Best practices and methodologies`,
            `Integration with other ${subject} concepts`
          ],
          examples: [
            `Real-world application of ${mainTopic} in professional settings`,
            `Step-by-step demonstration of ${mainTopic} implementation`,
            `Case study showing successful ${mainTopic} usage`,
            `Common scenarios where ${mainTopic} is essential`
          ],
          exercises: [
            `Practice: Apply ${mainTopic} concepts to solve basic problems`,
            `Exercise: Implement ${mainTopic} in a practical scenario`,
            `Activity: Analyze existing ${mainTopic} implementations`,
            `Challenge: Create your own ${mainTopic} solution`
          ]
        },
        resources: [
          {
            type: 'article',
            title: `${mainTopic} Comprehensive Guide`,
            description: `In-depth coverage of ${mainTopic} concepts and applications`
          },
          {
            type: 'practice',
            title: `${mainTopic} Practice Exercises`,
            description: `Hands-on exercises to master ${mainTopic}`
          }
        ],
        totalTime: 90
      });
    }
    
    return dailyContent;
  }
  
  // Extract topics from syllabus text
  extractTopicsFromSyllabus(syllabusText, subject) {
    const topics = [];
    const lines = syllabusText.split('\n').filter(line => line.trim());
    
    // Look for numbered items, bullet points, or chapter headings
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\./) || 
          trimmed.match(/^[-*•]/) || 
          trimmed.includes('Chapter') || 
          trimmed.includes('Unit') ||
          trimmed.includes('Module') ||
          trimmed.includes('Topic')) {
        const topic = trimmed.replace(/^\d+\.|\*|-|•/g, '').trim();
        if (topic.length > 3 && topic.length < 100) {
          topics.push(topic);
        }
      }
    });
    
    // If no topics found, create default structure
    if (topics.length === 0) {
      topics.push(
        `Introduction to ${subject}`,
        `${subject} Fundamentals`,
        `Core ${subject} Concepts`,
        `Practical ${subject} Applications`,
        `Advanced ${subject} Topics`,
        `${subject} Best Practices`,
        `Review and Assessment`
      );
    }
    
    return topics;
  }
  
  // Join a quiz by access code
  async joinQuizByCode(req, res) {
    try {
      const { accessCode } = req.body;
      
      if (!accessCode) {
        return res.status(400).json({
          success: false,
          message: 'Access code is required'
        });
      }
      
      const quiz = await Quiz.findOne({ accessCode });
      
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found with the provided access code'
        });
      }
      
      // Add the user to the list of participants if not already included
      if (!quiz.participants.includes(req.userId)) {
        quiz.participants.push(req.userId);
        await quiz.save();
      }
      
      res.json({
        success: true,
        message: 'Successfully joined the quiz',
        quiz
      });
    } catch (error) {
      logger.error('Join quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getQuizzes(req, res) {
    try {
      const { topic, difficulty } = req.query;
      const filter = { isPublic: true }; // Only show public quizzes by default

      if (topic) filter.topic = new RegExp(topic, 'i');
      if (difficulty) filter.difficulty = difficulty;

      const quizzes = await Quiz.find(filter)
        .populate('creator', 'username firstName lastName')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        quizzes
      });
    } catch (error) {
      logger.error('Get quizzes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async submitQuizAttempt(req, res) {
    try {
      const { quizId, answers } = req.body;

      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Calculate score
      let correctAnswers = 0;
      const results = [];

      for (let i = 0; i < quiz.questions.length; i++) {
        const question = quiz.questions[i];
        const userAnswer = answers[i];
        const isCorrect = userAnswer === question.correct;

        if (isCorrect) correctAnswers++;

        results.push({
          questionIndex: i,
          userAnswer,
          correctAnswer: question.correct,
          isCorrect
        });
      }

      const score = (correctAnswers / quiz.questions.length) * 100;

      const quizAttempt = new QuizAttempt({
        userId: req.userId,
        quizId,
        answers,
        score,
        results,
        completedAt: new Date()
      });

      await quizAttempt.save();

      res.json({
        success: true,
        message: 'Quiz submitted successfully',
        attempt: quizAttempt,
        score,
        correctAnswers,
        totalQuestions: quiz.questions.length
      });
    } catch (error) {
      logger.error('Submit quiz attempt error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getQuizAttempts(req, res) {
    try {
      const attempts = await QuizAttempt.find({ userId: req.userId })
        .populate('quizId', 'title topic difficulty')
        .sort({ completedAt: -1 });

      res.json({
        success: true,
        attempts
      });
    } catch (error) {
      logger.error('Get quiz attempts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async explainConcept(req, res) {
    try {
      const { concept, level = 'intermediate' } = req.body;

      const aiResponse = await aiService.explainConcept(concept, level);

      if (!aiResponse.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate explanation'
        });
      }

      res.json({
        success: true,
        explanation: aiResponse.content
      });
    } catch (error) {
      logger.error('Explain concept error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async generateFlashcards(req, res) {
    try {
      const { topic, count = 20 } = req.body;

      const aiResponse = await aiService.generateFlashcards(topic, count);

      if (!aiResponse.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate flashcards'
        });
      }

      let flashcards;
      try {
        flashcards = JSON.parse(aiResponse.content);
      } catch (parseError) {
        logger.error('Failed to parse AI flashcards response:', parseError);
        return res.status(500).json({
          success: false,
          message: 'Failed to parse flashcards'
        });
      }

      res.json({
        success: true,
        flashcards
      });
    } catch (error) {
      logger.error('Generate flashcards error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getTopicContent(req, res) {
    try {
      const { studyPlanId, topicId } = req.params;

      const studyPlan = await StudyPlan.findOne({
        _id: studyPlanId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      // Check if this is a daily content request (topicId is actually day number)
      const dayNumber = parseInt(topicId);
      if (!isNaN(dayNumber) && studyPlan.dailyContent && studyPlan.dailyContent.length > 0) {
        const dailyContent = studyPlan.dailyContent.find(day => day.day === dayNumber);
        if (dailyContent) {
          return res.json({
            success: true,
            content: dailyContent.content
          });
        }
      }

      // Fallback to topic-based content
      const topic = studyPlan.topics.id(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Generate detailed content for this topic using AI
      let content;
      try {
        const previousTopics = studyPlan.topics
          .filter(t => t.order < topic.order)
          .map(t => t.title);
        
        const aiResponse = await aiService.generateDailyContent(
          topic.title, 
          topic.order, 
          studyPlan.difficulty, 
          previousTopics
        );
        
        if (aiResponse.success) {
          try {
            content = JSON.parse(aiResponse.content);
          } catch (parseError) {
            throw new Error('Failed to parse AI content');
          }
        } else {
          throw new Error('AI content generation failed');
        }
      } catch (error) {
        logger.error('AI content generation error:', error);
        // Fallback content
        content = {
          overview: `Learn about ${topic.title} in this comprehensive study session. This topic is essential for understanding ${studyPlan.subject} at the ${studyPlan.difficulty} level.`,
          keyPoints: [
            `Understanding ${topic.title} fundamentals`,
            `Key principles and concepts`,
            `Practical applications and use cases`,
            `Common challenges and solutions`,
            `Advanced techniques in ${topic.title}`
          ],
          examples: [
            `Example 1: Basic ${topic.title} demonstration with step-by-step explanation`,
            `Example 2: Real-world application of ${topic.title} in practice`,
            `Example 3: Problem-solving scenario using ${topic.title}`,
            `Example 4: Advanced ${topic.title} implementation`
          ],
          exercises: [
            `Practice: Apply ${topic.title} concepts to solve basic problems`,
            `Exercise: Implement ${topic.title} in a practical scenario`,
            `Activity: Create your own examples using ${topic.title}`,
            `Challenge: Solve advanced problems with ${topic.title}`
          ],
          resources: topic.resources || [
            {
              type: 'article',
              title: `${topic.title} Comprehensive Guide`,
              description: `In-depth article covering all aspects of ${topic.title}`
            },
            {
              type: 'practice',
              title: `${topic.title} Practice Exercises`,
              description: `Interactive exercises to master ${topic.title}`
            }
          ]
        };
      }

      res.json({
        success: true,
        content
      });
    } catch (error) {
      logger.error('Get topic content error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Progress tracking endpoints
  async startStudySession(req, res) {
    try {
      const { studyPlanId, topicId } = req.body;

      let progress = await UserProgress.findOne({
        user: req.userId,
        studyPlan: studyPlanId,
        topic: topicId
      });

      if (!progress) {
        progress = new UserProgress({
          user: req.userId,
          studyPlan: studyPlanId,
          topic: topicId
        });
      }

      await progress.startStudySession();
      const sessionIndex = progress.studySessions.length - 1;

      res.json({
        success: true,
        sessionId: `${progress._id}-${sessionIndex}`,
        message: 'Study session started'
      });
    } catch (error) {
      logger.error('Start study session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async endStudySession(req, res) {
    try {
      const { sessionId, completed, studyTime, sectionsCompleted } = req.body;
      const [progressId, sessionIndex] = sessionId.split('-');

      const progress = await UserProgress.findById(progressId);
      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress record not found'
        });
      }

      await progress.endStudySession(parseInt(sessionIndex), completed);

      res.json({
        success: true,
        message: 'Study session ended'
      });
    } catch (error) {
      logger.error('End study session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async trackSectionCompletion(req, res) {
    try {
      const { sessionId, sectionName, timeSpent } = req.body;
      const [progressId, sessionIndex] = sessionId.split('-');

      const progress = await UserProgress.findById(progressId);
      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress record not found'
        });
      }

      await progress.markSectionComplete(parseInt(sessionIndex), sectionName, timeSpent);

      res.json({
        success: true,
        message: 'Section completion tracked'
      });
    } catch (error) {
      logger.error('Track section completion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getUserStats(req, res) {
    try {
      const stats = await UserProgress.getUserStats(req.userId);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async createBasicDailyStructure(subject, level, durationInDays, textContent) {
    const dailyContent = [];
    
    for (let day = 1; day <= durationInDays; day++) {
      const weekNumber = Math.ceil(day / 7);
      
      dailyContent.push({
        day,
        title: `Day ${day}: ${subject} - Week ${weekNumber}`,
        objectives: [
          `Understand ${subject} concepts for day ${day}`,
          `Apply ${subject} principles in practice`,
          `Complete daily ${subject} exercises`
        ],
        overview: `Day ${day} of your ${subject} journey. Today we'll focus on building your understanding of key concepts and applying them through practical exercises.`,
        keyPoints: [
          `Key concept ${day} in ${subject}`,
          `Important principle for ${subject} mastery`,
          `Practical application of ${subject}`,
          `Advanced topic in ${subject} for ${level} level`
        ],
        examples: [
          `Example ${day}.1: Basic ${subject} demonstration`,
          `Example ${day}.2: Real-world ${subject} application`,
          `Example ${day}.3: Problem-solving with ${subject}`
        ],
        exercises: [
          `Exercise ${day}.1: Practice ${subject} fundamentals`,
          `Exercise ${day}.2: Apply ${subject} concepts`,
          `Exercise ${day}.3: Create ${subject} solutions`
        ],
        resources: [
          {
            type: 'article',
            title: `${subject} Day ${day} Reading`,
            description: `Essential reading material for day ${day}`
          },
          {
            type: 'practice',
            title: `${subject} Day ${day} Exercises`,
            description: `Practice exercises for day ${day}`
          }
        ],
        totalTime: 90
      });
    }
    
    return dailyContent;
  }

  parseDuration(duration) {
    if (!duration) return 30;
    
    const durationStr = duration.toLowerCase();
    if (durationStr.includes('month')) {
      const months = parseInt(durationStr) || 1;
      return months * 30;
    } else if (durationStr.includes('week')) {
      const weeks = parseInt(durationStr) || 1;
      return weeks * 7;
    } else if (durationStr.includes('day')) {
      return parseInt(durationStr) || 30;
    } else {
      // Try to parse as number (assume days)
      return parseInt(duration) || 30;
    }
  }

  async createFallbackDailyContent(subject, level, durationInDays) {
    const dailyContent = [];
    
    for (let day = 1; day <= durationInDays; day++) {
      dailyContent.push({
        day,
        title: `Day ${day}: ${subject} Study Session`,
        objectives: [
          `Learn ${subject} concepts for day ${day}`,
          `Practice ${subject} skills`,
          `Review and reinforce learning`
        ],
        overview: `Welcome to day ${day} of your ${subject} study plan! Today's session will help you build a strong foundation in ${subject} concepts and develop practical skills.`,
        keyPoints: [
          `Fundamental concept ${day} in ${subject}`,
          `Key principle for ${subject} understanding`,
          `Practical application of ${subject} knowledge`,
          `Important ${subject} technique for ${level} level`
        ],
        examples: [
          `Example: Basic ${subject} concept demonstration`,
          `Example: Real-world ${subject} application`,
          `Example: Step-by-step ${subject} problem solving`
        ],
        exercises: [
          `Practice: Apply ${subject} fundamentals`,
          `Exercise: Solve ${subject} problems`,
          `Activity: Create ${subject} examples`
        ],
        resources: [
          {
            type: 'article',
            title: `${subject} Learning Resource`,
            description: `Comprehensive guide to ${subject} concepts`
          },
          {
            type: 'practice',
            title: `${subject} Practice Session`,
            description: `Interactive exercises for ${subject} mastery`
          }
        ],
        totalTime: 90
      });
    }
    
    return dailyContent;
  }

  // Get study content for a specific day/topic
  async getStudyContent(req, res) {
    try {
      const { planId, topicId } = req.params;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      // Find the specific day content
      let dayContent = null;
      if (studyPlan.dailyContent && studyPlan.dailyContent.length > 0) {
        dayContent = studyPlan.dailyContent.find(day => day.day.toString() === topicId);
      }

      if (!dayContent && studyPlan.topics && studyPlan.topics.length > 0) {
        const topic = studyPlan.topics.find(t => t._id?.toString() === topicId);
        if (topic) {
          // Convert topic to day content format
          dayContent = {
            day: parseInt(topicId) || 1,
            title: topic.title,
            objectives: [`Learn ${topic.title}`, `Master key concepts`],
            content: {
              overview: topic.description || `Study session for ${topic.title}`,
              keyPoints: [`Key concept 1 for ${topic.title}`, `Important principle`, `Practical application`],
              examples: [`Example 1: Basic demonstration`, `Example 2: Real-world application`],
              exercises: [`Practice exercise 1`, `Practice exercise 2`]
            },
            resources: topic.resources || [],
            totalTime: topic.estimatedTime || 90
          };
        }
      }

      if (!dayContent) {
        return res.status(404).json({
          success: false,
          message: 'Study content not found'
        });
      }

      res.json({
        success: true,
        content: dayContent
      });
    } catch (error) {
      logger.error('Get study content error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}


export default new StudyController();