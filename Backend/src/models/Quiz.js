import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  questions: [{
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'short_answer', 'essay'],
      required: true
    },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    correctAnswer: String, // For short answer and essay questions
    explanation: String,
    points: {
      type: Number,
      default: 1,
      min: [1, 'Points must be at least 1']
    },
    timeLimit: Number, // in seconds
    tags: [String]
  }],
  settings: {
    timeLimit: Number, // in minutes, null for unlimited
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showCorrectAnswers: { type: Boolean, default: true },
    allowRetakes: { type: Boolean, default: true },
    maxAttempts: { type: Number, default: null }, // null for unlimited
    passingScore: { type: Number, default: 70 } // percentage
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiPrompt: String,
  studyPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyPlan'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  stats: {
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Calculate total points
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.reduce((total, question) => total + question.points, 0);
});

// Get quiz statistics
quizSchema.methods.getStats = async function() {
  const QuizAttempt = mongoose.model('QuizAttempt');
  const attempts = await QuizAttempt.find({ quiz: this._id });
  
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      completionRate: 0
    };
  }
  
  const completedAttempts = attempts.filter(attempt => attempt.status === 'completed');
  const totalScore = completedAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
  
  return {
    totalAttempts: attempts.length,
    averageScore: completedAttempts.length > 0 ? Math.round(totalScore / completedAttempts.length) : 0,
    completionRate: Math.round((completedAttempts.length / attempts.length) * 100)
  };
};

export default mongoose.model('Quiz', quizSchema);