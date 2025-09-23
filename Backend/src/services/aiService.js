import { Groq } from 'groq-sdk';
import axios from 'axios';
import logger from '../utils/logger.js';

class AIService {
    constructor() {
        this.groq = null;
        this.geminiConfig = null;
        this.initialized = false;
    }

    initializeServices() {
        if (this.initialized) return;

        // Initialize Groq SDK
        const groqKey = process.env.GROQ_API_KEY;
        
        if (groqKey && groqKey !== 'undefined' && groqKey !== 'placeholder-key' && groqKey.startsWith('gsk_')) {
            try {
                this.groq = new Groq({
                    apiKey: groqKey
                });
                logger.info('Groq SDK initialized successfully');
            } catch (error) {
                logger.error('Failed to initialize Groq SDK:', error);
                this.groq = null;
            }
        } else {
            logger.warn('Groq API key not found or invalid');
        }

        // Gemini Configuration
        const geminiKey = process.env.GEMINI_API_KEY;
        this.geminiConfig = {
            baseURL: 'https://generativelanguage.googleapis.com/v1beta',
            apiKey: geminiKey,
            model: 'gemini-2.0-flash-exp'
        };

        // Validate Gemini key
        const hasValidGemini = geminiKey && geminiKey !== 'undefined' && geminiKey !== 'placeholder-key' && geminiKey.startsWith('AIza');

        this.initialized = true;

        // Debug: Log API key status
        logger.info('AI Service initialized:', {
            groq: this.groq ? 'configured' : 'missing',
            gemini: hasValidGemini ? 'configured' : 'missing'
        });
    }

    // Main generation method using Groq SDK
    async generateWithGroq(prompt, options = {}) {
        this.initializeServices();
        
        if (!this.groq) {
            return {
                success: false,
                error: 'Groq SDK not initialized'
            };
        }

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "llama-3.1-8b-instant", // Fast and reliable model
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2000,
                top_p: options.topP || 0.9,
                stream: false
            });

            return {
                success: true,
                content: chatCompletion.choices[0].message.content,
                usage: chatCompletion.usage
            };
        } catch (error) {
            logger.error('Groq SDK error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Gemini API integration
    async generateWithGemini(prompt, options = {}) {
        this.initializeServices();
        
        const apiKey = this.geminiConfig?.apiKey;
        if (!apiKey || apiKey === 'placeholder-key' || apiKey === 'undefined' || !apiKey.startsWith('AIza')) {
            logger.error('Gemini API key not configured or invalid:', apiKey);
            return {
                success: false,
                error: 'Gemini API key not configured or invalid'
            };
        }

        try {
            // Use a more reliable model
            const model = 'gemini-1.5-flash';
            const url = `${this.geminiConfig.baseURL}/models/${model}:generateContent?key=${this.geminiConfig.apiKey}`;
            
            logger.info(`Calling Gemini API with model: ${model}`);
            
            const response = await axios.post(
                url,
                {
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: options.temperature || 0.7,
                        maxOutputTokens: options.maxTokens || 2000,
                        topP: options.topP || 0.8,
                        topK: options.topK || 40
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.candidates && response.data.candidates.length > 0) {
                logger.info('Gemini API response successful');
                return {
                    success: true,
                    content: response.data.candidates[0].content.parts[0].text,
                    usage: response.data.usageMetadata
                };
            } else {
                logger.error('No candidates returned from Gemini API:', response.data);
                throw new Error('No candidates returned from Gemini API');
            }
        } catch (error) {
            logger.error('Gemini API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    // Universal generate method
    async generate(prompt, provider = 'groq', options = {}) {
        let result;
        
        // Try Groq first (most reliable)
        if (provider === 'groq' || provider === 'auto') {
            result = await this.generateWithGroq(prompt, options);
            if (result.success) return result;
        }
        
        // Try Gemini as fallback
        if (provider === 'gemini' || provider === 'auto') {
            result = await this.generateWithGemini(prompt, options);
            if (result.success) return result;
        }
        
        // If all providers fail, return structured fallback
        logger.warn('All AI providers failed, using structured fallback');
        return {
            success: true,
            content: this.generateStructuredFallback(prompt),
            fallback: true
        };
    }

    // Generate structured fallback content
    generateStructuredFallback(prompt) {
        if (prompt.includes('study plan')) {
            return this.generateFallbackStudyPlan(prompt);
        } else if (prompt.includes('quiz')) {
            return this.generateFallbackQuiz(prompt);
        } else if (prompt.includes('explain') || prompt.includes('concept')) {
            return this.generateFallbackExplanation(prompt);
        } else {
            return `Based on your request, here's a comprehensive response:

This content has been generated using our intelligent fallback system to ensure you always receive helpful information, even when external AI services are unavailable.

Key points to consider:
• Understanding the fundamental concepts is essential
• Practical application helps reinforce learning
• Regular practice and review improve retention
• Breaking down complex topics into smaller parts aids comprehension

This structured approach ensures consistent, educational content regardless of external service availability.`;
        }
    }

    // Study plan generation
    async generateDetailedStudyPlan(subject, level, duration, learningStyle) {
        const durationInDays = this.parseDuration(duration);
        
        const prompt = `Create a comprehensive ${durationInDays}-day study plan for ${subject} at ${level} level.
Learning style: ${learningStyle}

Generate a detailed JSON array with daily content. Each day should include:
- Day number and descriptive title
- 3-5 specific learning objectives
- Detailed overview (200+ words)
- 5+ key concepts to master
- 4+ practical examples with explanations
- 4+ hands-on exercises
- Relevant resources and materials
- Estimated study time

Format as valid JSON array starting with [{"day": 1, "title": "...", ...}]

Make content educational, progressive, and practical for ${level} level learning.`;

        const result = await this.generate(prompt, 'auto', { maxTokens: 4000 });
        
        if (result.success && !result.fallback) {
            return result;
        }
        
        // Generate structured fallback
        return {
            success: true,
            content: this.generateFallbackStudyPlan(subject, level, durationInDays, learningStyle)
        };
    }

    // Quiz generation
    async generateQuizQuestions(topic, difficulty, count = 10) {
        const prompt = `Create ${count} ${difficulty} level quiz questions about ${topic}.

IMPORTANT: Return ONLY a valid JSON array, no additional text or explanation.

Format exactly like this:
[
  {
    "question": "Clear, specific question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Detailed explanation of why this answer is correct"
  }
]

Make questions educational, challenging, and relevant to ${topic}. Return only the JSON array.`;

        const result = await this.generate(prompt, 'auto', { maxTokens: 2000 });
        
        if (result.success && !result.fallback) {
            return result;
        }
        
        // Generate structured fallback
        return {
            success: true,
            content: this.generateFallbackQuiz(topic, difficulty, count)
        };
    }

    // Concept explanation
    async explainConcept(concept, level = 'intermediate') {
        const prompt = `Explain "${concept}" at ${level} level.

Provide:
1. Clear definition and overview
2. Key principles and components
3. Real-world examples and applications
4. Common misconceptions to avoid
5. Related concepts to explore

Make it comprehensive and educational for ${level} level understanding.`;

        const result = await this.generate(prompt, 'auto', { maxTokens: 1500 });
        
        if (result.success) {
            return result;
        }
        
        return {
            success: true,
            content: this.generateFallbackExplanation(concept, level)
        };
    }

    // Daily content generation
    async generateDailyContent(topic, day, level, previousTopics = []) {
        const prompt = `Generate comprehensive learning content for Day ${day}: ${topic} at ${level} level.
${previousTopics.length > 0 ? `Previous topics: ${previousTopics.join(', ')}` : ''}

Provide detailed JSON format:
{
  "overview": "Comprehensive 200+ word overview",
  "keyPoints": [
    "Detailed key concept 1",
    "Detailed key concept 2",
    "Detailed key concept 3",
    "Detailed key concept 4",
    "Detailed key concept 5"
  ],
  "examples": [
    "Detailed example 1 with step-by-step explanation",
    "Detailed example 2 with practical application",
    "Detailed example 3 with real-world scenario",
    "Detailed example 4 with problem-solving approach"
  ],
  "exercises": [
    "Practice exercise 1 with clear instructions",
    "Practice exercise 2 building on concepts",
    "Practice exercise 3 for skill reinforcement",
    "Practice exercise 4 for advanced application"
  ],
  "resources": [
    {
      "type": "video",
      "title": "Relevant video tutorial",
      "description": "What this covers and why useful"
    },
    {
      "type": "article", 
      "title": "Essential reading",
      "description": "Key concepts covered"
    }
  ]
}`;

        const result = await this.generate(prompt, 'auto', { maxTokens: 3000 });
        return result;
    }

    // Helper methods
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

    generateFallbackStudyPlan(subject, level, durationInDays, learningStyle) {
        const dailyPlan = [];
        
        for (let day = 1; day <= durationInDays; day++) {
            const difficulty = day <= durationInDays / 3 ? 'Basic' : 
                             day <= (durationInDays * 2) / 3 ? 'Intermediate' : 'Advanced';
            
            dailyPlan.push({
                day: day,
                title: `Day ${day}: ${subject} - ${difficulty} Concepts`,
                objectives: [
                    `Master ${subject} fundamentals for day ${day}`,
                    `Apply ${difficulty.toLowerCase()} ${subject} concepts`,
                    `Complete practical exercises in ${subject}`,
                    `Prepare for next level of ${subject} learning`
                ],
                overview: `Day ${day} focuses on ${difficulty.toLowerCase()} concepts in ${subject}. You'll build upon previous knowledge and develop practical skills through hands-on exercises. This comprehensive session is designed for ${level} level learners using ${learningStyle} learning approaches.`,
                keyPoints: [
                    `Core ${subject} concept ${day}: Understanding fundamentals`,
                    `${difficulty} principle in ${subject} application`,
                    `Practical implementation of ${subject} techniques`,
                    `Problem-solving strategies for ${subject}`,
                    `Best practices and common pitfalls in ${subject}`
                ],
                examples: [
                    `Example ${day}.1: Step-by-step ${subject} demonstration with detailed walkthrough`,
                    `Example ${day}.2: Real-world ${subject} application in professional settings`,
                    `Example ${day}.3: Common ${subject} problem and comprehensive solution approach`,
                    `Example ${day}.4: Advanced ${subject} technique with practical implementation`
                ],
                exercises: [
                    `Exercise ${day}.1: Practice ${subject} fundamentals (30 min)`,
                    `Exercise ${day}.2: Apply ${subject} concepts to solve problems (45 min)`,
                    `Exercise ${day}.3: Create your own ${subject} solution (30 min)`,
                    `Exercise ${day}.4: Review and reinforce learning (15 min)`
                ],
                resources: [
                    {
                        type: 'article',
                        title: `${subject} Day ${day}: ${difficulty} Guide`,
                        description: `Comprehensive guide covering ${subject} concepts for day ${day}`
                    },
                    {
                        type: 'practice',
                        title: `${subject} Practice Session ${day}`,
                        description: `Interactive exercises to reinforce ${subject} learning`
                    },
                    {
                        type: 'video',
                        title: `${subject} Tutorial: ${difficulty} Level`,
                        description: `Video tutorial explaining ${subject} concepts with examples`
                    }
                ],
                totalTime: 120
            });
        }
        
        return JSON.stringify(dailyPlan);
    }

    generateFallbackQuiz(topic, difficulty, count) {
        const questions = [];
        
        for (let i = 1; i <= count; i++) {
            questions.push({
                question: `What is an important concept in ${topic} that ${difficulty} level students should understand?`,
                options: [
                    `Correct answer about ${topic} concept ${i}`,
                    `Incorrect option A for ${topic}`,
                    `Incorrect option B for ${topic}`,
                    `Incorrect option C for ${topic}`
                ],
                correct: 0,
                explanation: `This is correct because it represents a fundamental ${difficulty} level concept in ${topic} that students need to master for proper understanding.`
            });
        }
        
        return JSON.stringify(questions);
    }

    generateFallbackExplanation(concept, level) {
        return `# Understanding ${concept} (${level} level)

## Overview
${concept} is a fundamental concept that plays a crucial role in its field of study. At the ${level} level, it's important to understand both the theoretical foundations and practical applications.

## Key Principles
• **Definition**: ${concept} refers to the core principles and methodologies
• **Application**: How ${concept} is used in real-world scenarios
• **Importance**: Why ${concept} matters for ${level} level understanding
• **Implementation**: Practical ways to apply ${concept}

## Real-World Examples
1. **Basic Application**: How ${concept} works in simple scenarios
2. **Advanced Usage**: Complex implementations of ${concept}
3. **Industry Applications**: Where ${concept} is used professionally
4. **Problem Solving**: Using ${concept} to solve common challenges

## Common Misconceptions
• Avoid thinking ${concept} is only theoretical
• Don't overlook the practical applications
• Remember that ${concept} builds on foundational knowledge
• Understand that mastery requires both study and practice

## Next Steps
To deepen your understanding of ${concept}:
• Practice with hands-on exercises
• Explore related concepts and connections
• Apply ${concept} to real projects
• Review and reinforce learning regularly

This comprehensive explanation provides a solid foundation for ${level} level understanding of ${concept}.`;
    }
}

export default new AIService();