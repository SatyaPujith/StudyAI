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
                this.groq = new Groq({ apiKey: groqKey });
                logger.info('Groq SDK initialized successfully');
            } catch (error) {
                logger.error(`Failed to initialize Groq SDK: ${error.message}`);
                this.groq = null;
            }
        } else {
            logger.warn('Groq API key not found or invalid');
        }

        // Gemini Configuration
        const geminiKey = process.env.GEMINI_API_KEY;
        this.geminiConfig = {
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/',
            apiKey: geminiKey,
            model: 'gemini-2.0-flash'
        };

        this.initialized = true;

        logger.info('AI Service initialized:', {
            groq: this.groq ? 'configured' : 'missing',
            gemini: geminiKey && geminiKey.startsWith('AIza') ? 'configured' : 'missing'
        });
    }

    // Main generation method using Groq SDK
    async generateWithGroq(prompt, options = {}) {
        this.initializeServices();
        
        if (!this.groq) {
            return { success: false, error: 'Groq SDK not initialized' };
        }

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.1-8b-instant",
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2000,
                top_p: options.topP || 0.9,
                stream: false
            });

            return {
                success: true,
                content: chatCompletion.choices?.[0]?.message?.content || chatCompletion.choices?.[0]?.text || '',
                usage: chatCompletion.usage
            };
        } catch (error) {
            logger.error(`Groq SDK error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Gemini API integration
    async generateWithGemini(prompt, options = {}) {
        this.initializeServices();
        
        const apiKey = this.geminiConfig?.apiKey;
        if (!apiKey || apiKey === 'placeholder-key' || apiKey === 'undefined' || !apiKey.startsWith('AIza')) {
            logger.error(`Gemini API key not configured or invalid: ${apiKey}`);
            return { success: false, error: 'Gemini API key not configured or invalid' };
        }

        try {
            const model = 'gemini-1.5-flash';
            const url = `${this.geminiConfig.baseURL}${model}:generateContent?key=${this.geminiConfig.apiKey}`;
            
            logger.info(`Calling Gemini API with model: ${model}`);
            
            const response = await axios.post(
                url,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: options.temperature || 0.7,
                        maxOutputTokens: options.maxTokens || 2000,
                        topP: options.topP || 0.8,
                        topK: options.topK || 40
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                    ]
                },
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.data.candidates?.length > 0) {
                logger.info('Gemini API response successful');
                return {
                    success: true,
                    content: response.data.candidates[0].content.parts[0].text,
                    usage: response.data.usageMetadata
                };
            } else {
                logger.error(`No candidates returned from Gemini API: ${JSON.stringify(response.data)}`);
                throw new Error('No candidates returned from Gemini API');
            }
        } catch (error) {
            logger.error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    // Universal generate method
    async generate(prompt, provider = 'groq', options = {}) {
        this.initializeServices();
        let result;
        
        if (provider === 'groq' || provider === 'auto') {
            logger.info('Attempting Groq generation...');
            result = await this.generateWithGroq(prompt, options);
            if (result.success) {
                logger.info('Groq generation successful');
                return result;
            }
            logger.warn(`Groq generation failed: ${result.error}`);
        }
        
        if (provider === 'gemini' || provider === 'auto') {
            logger.info('Attempting Gemini generation...');
            result = await this.generateWithGemini(prompt, options);
            if (result.success) {
                logger.info('Gemini generation successful');
                return result;
            }
            logger.warn(`Gemini generation failed: ${result.error}`);
        }
        
        logger.warn('All AI providers failed, using structured fallback');
        return { success: true, content: this.generateStructuredFallback(prompt), fallback: true };
    }

    // Structured fallback content
    generateStructuredFallback(prompt) {
        if (prompt.includes('study plan')) return this.generateFallbackStudyPlan(prompt);
        if (prompt.includes('quiz')) return this.generateFallbackQuiz(prompt);
        if (prompt.includes('explain') || prompt.includes('concept')) return this.generateFallbackExplanation(prompt);
        
        return `Based on your request, here's a structured fallback response:
        
- Focus on understanding fundamental concepts
- Apply learning practically
- Practice and review consistently
- Break down complex topics into smaller parts`;
    }

    // Study plan generation
    async generateDetailedStudyPlan(subject, level, duration, learningStyle) {
        const durationInDays = this.parseDuration(duration);
        
        const prompt = `Create a comprehensive ${durationInDays}-day study plan for ${subject} at ${level} level.
Learning style: ${learningStyle}

Return ONLY a valid JSON array with this structure:
[
  {
    "day": 1,
    "title": "Introduction to [Specific Topic]",
    "objectives": ["Learn basics", "Understand fundamentals", "Apply knowledge"],
    "content": {
      "overview": "Detailed overview (200+ words)",
      "keyPoints": ["Concept 1", "Concept 2"],
      "examples": ["Example 1", "Example 2"],
      "exercises": ["Exercise 1", "Exercise 2"]
    },
    "totalTime": 90
  }
]`;

        const result = await this.generate(prompt, 'auto', { maxTokens: 4000 });
        if (result.success && !result.fallback) return result;
        
        return { success: true, content: this.generateFallbackStudyPlan(subject, level, durationInDays, learningStyle) };
    }

    // Quiz generation
    async generateQuizQuestions(topic, difficulty, count = 10) {
        this.initializeServices();
        
        const prompt = `Create ${count} ${difficulty} multiple choice quiz questions about ${topic}.
Return ONLY a valid JSON array with this format:
[
  {
    "question": "What is ...?",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "Why correct"
  }
]`;

        logger.info(`Generating ${count} ${difficulty} quiz questions for ${topic}`);
        const result = await this.generate(prompt, 'gemini', { maxTokens: 2000 });
        if (result.success && !result.fallback) return result;
        
        logger.info('Using fallback quiz generation');
        return { success: true, content: this.generateFallbackQuiz(topic, difficulty, count) };
    }

    // Concept explanation
    async explainConcept(concept, level = 'intermediate') {
        this.initializeServices();
        
        const prompt = `Explain "${concept}" at ${level} level:
1. Definition
2. Key principles
3. Real-world examples
4. Misconceptions
5. Related concepts`;

        logger.info(`Explaining concept: ${concept} at ${level}`);
        const result = await this.generate(prompt, 'auto', { maxTokens: 1500 });
        if (result.success) return result;
        
        logger.info('Using fallback explanation');
        return { success: true, content: this.generateFallbackExplanation(concept, level) };
    }

    // Daily content generation
    async generateDailyContent(topic, day, level, previousTopics = []) {
        this.initializeServices();
        
        const prompt = `Generate content for Day ${day}: ${topic} at ${level}.
Previous topics: ${previousTopics.join(', ')}

Return JSON:
{
  "overview": "...",
  "keyPoints": ["..."],
  "examples": ["..."],
  "exercises": ["..."],
  "resources": [{"type": "video", "title": "..."}]
}`;

        logger.info(`Generating daily content for Day ${day}: ${topic}`);
        const result = await this.generate(prompt, 'auto', { maxTokens: 3000 });
        return result;
    }

    // Helpers
    parseDuration(duration) {
        if (!duration) return 30;
        const str = duration.toLowerCase();
        if (str.includes('month')) return (parseInt(str) || 1) * 30;
        if (str.includes('week')) return (parseInt(str) || 1) * 7;
        if (str.includes('day')) return parseInt(str) || 30;
        return parseInt(duration) || 30;
    }

    generateFallbackStudyPlan(subject, level, durationInDays, learningStyle) {
        const plan = [];
        for (let day = 1; day <= durationInDays; day++) {
            const difficulty = day <= durationInDays / 3 ? 'Basic' :
                               day <= (durationInDays * 2) / 3 ? 'Intermediate' : 'Advanced';
            
            plan.push({
                day,
                title: `Day ${day}: ${subject} - ${difficulty} Concepts`,
                objectives: [
                    `Master fundamentals for Day ${day}`,
                    `Apply ${difficulty} ${subject} concepts`,
                    `Do practical exercises`,
                    `Prepare for next stage`
                ],
                overview: `Day ${day} focuses on ${difficulty} ${subject} concepts at ${level} level with ${learningStyle} learning approach.`,
                keyPoints: [`Concept ${day}-1`, `Concept ${day}-2`],
                examples: [`Example ${day}-1`, `Example ${day}-2`],
                exercises: [`Exercise ${day}-1`, `Exercise ${day}-2`],
                resources: [{ type: 'article', title: `${subject} Guide Day ${day}` }],
                totalTime: 120
            });
        }
        return plan;
    }

    generateFallbackQuiz(topic, difficulty, count) {
        const questions = [];
        for (let i = 1; i <= count; i++) {
            questions.push({
                question: `What is a key ${topic} concept at ${difficulty} level?`,
                options: [
                    `Correct ${topic} concept ${i}`,
                    `Wrong option A`,
                    `Wrong option B`,
                    `Wrong option C`
                ],
                correct: 0,
                explanation: `This represents a fundamental ${topic} ${difficulty} concept.`
            });
        }
        return questions;
    }

    generateFallbackExplanation(concept, level) {
        return `# Understanding ${concept} (${level})

## Overview
${concept} is an important idea in its domain. At ${level} level, you need both theory and applications.

## Key Principles
- Definition and meaning
- Applications
- Importance
- Practical use

## Real-World Examples
- Simple applications
- Advanced use
- Industry cases
- Problem solving

## Misconceptions
- It's not only theory
- Practical relevance matters
- Builds on basics
- Requires practice

## Next Steps
- Do exercises
- Explore related ideas
- Apply in projects
- Review regularly`;
    }
}

export default new AIService();
