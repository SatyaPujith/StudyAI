import { studyAPI, aiAPI } from '../lib/api';

export interface StudyPlan {
  _id: string;
  title?: string;
  subject: string;
  difficulty: string;
  estimatedDuration: number;
  learningStyle?: string;
  content?: string;
  status: string;
  progress: {
    percentage: number;
    completedTopics: number;
    totalTopics: number;
  };
  topics?: Array<{
    _id: string;
    title: string;
    description: string;
    status: string;
    estimatedTime: number;
  }>;
  dailyContent?: Array<{
    day: number;
    date: string;
    title: string;
    objectives: string[];
    content: {
      overview: string;
      keyPoints: string[];
      examples: string[];
      exercises: string[];
    };
    totalTime: number;
    status: string;
  }>;
  aiPrompt?: string;
  createdAt: string;
}

export interface Quiz {
  _id: string;
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizAttempt {
  _id: string;
  quizId: string;
  score: number;
  results: any[];
  completedAt: string;
}

export interface Conversation {
  _id: string;
  messages: Message[];
  lastActivity: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

class DataService {
  private handleError(error: unknown, context: string): void {
    console.error(`${context}:`, error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('Error details:', (error as any).response?.data);
    }
  }

  // Study Plans
  async getStudyPlans(): Promise<StudyPlan[]> {
    try {
      console.log('Fetching study plans from API...');
      const response = await studyAPI.getStudyPlans();
      console.log('API response:', response.data);
      return response.data.studyPlans || [];
    } catch (error) {
      this.handleError(error, 'Error fetching study plans');
      return [];
    }
  }

  async createStudyPlan(data: {
    subject: string;
    level: string;
    duration: string;
    learningStyle: string;
    goals: string[];
  }): Promise<StudyPlan | null> {
    try {
      const response = await studyAPI.createStudyPlan(data);
      return response.data.studyPlan;
    } catch (error) {
      console.error('Error creating study plan:', error);
      return null;
    }
  }

  async updateStudyPlan(id: string, data: Partial<StudyPlan>): Promise<StudyPlan | null> {
    try {
      const response = await studyAPI.updateStudyPlan(id, data);
      return response.data.studyPlan;
    } catch (error) {
      console.error('Error updating study plan:', error);
      return null;
    }
  }

  // Quizzes
  async getQuizzes(filters?: { topic?: string; difficulty?: string }): Promise<Quiz[]> {
    try {
      const response = await studyAPI.getQuizzes(filters);
      return response.data.quizzes || [];
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return [];
    }
  }

  async createQuiz(data: {
    topic: string;
    difficulty: string;
    questionCount?: number;
  }): Promise<Quiz | null> {
    try {
      const response = await studyAPI.createQuiz(data);
      return response.data.quiz;
    } catch (error) {
      console.error('Error creating quiz:', error);
      return null;
    }
  }

  async submitQuizAttempt(data: {
    quizId: string;
    answers: number[];
  }): Promise<any> {
    try {
      const response = await studyAPI.submitQuizAttempt(data);
      return response.data;
    } catch (error) {
      console.error('Error submitting quiz attempt:', error);
      return null;
    }
  }

  async getQuizAttempts(): Promise<QuizAttempt[]> {
    try {
      const response = await studyAPI.getQuizAttempts();
      return response.data.attempts || [];
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      return [];
    }
  }

  // AI Features
  async explainConcept(concept: string, level: string = 'intermediate'): Promise<string | null> {
    try {
      const response = await studyAPI.explainConcept({ concept, level });
      return response.data.explanation;
    } catch (error) {
      console.error('Error explaining concept:', error);
      return null;
    }
  }

  async generateFlashcards(topic: string, count: number = 20): Promise<any[] | null> {
    try {
      const response = await studyAPI.generateFlashcards({ topic, count });
      return response.data.flashcards;
    } catch (error) {
      console.error('Error generating flashcards:', error);
      return null;
    }
  }

  // AI Chat
  async sendMessage(message: string, conversationId?: string): Promise<any> {
    try {
      const response = await aiAPI.chat({ message, conversationId });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await aiAPI.getConversations();
      return response.data.conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const response = await aiAPI.getConversation(id);
      return response.data.conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  // Health Check
  async checkAIHealth(): Promise<any> {
    try {
      const response = await aiAPI.healthCheck();
      return response.data.services;
    } catch (error) {
      console.error('Error checking AI health:', error);
      return {};
    }
  }
}

export default new DataService();