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
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'mixed'],
    default: 'multiple_choice',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  accessCode: {
    type: String,
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  questions: [{
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    options: [String],
    correct: Number,
    explanation: String,
    points: {
      type: Number,
      default: 1,
      min: [1, 'Points must be at least 1']
    },
    timeLimit: Number // in seconds
  }],
  tags: [String]
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