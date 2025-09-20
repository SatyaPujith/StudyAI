import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    answer: mongoose.Schema.Types.Mixed, // Can be string, array, or object
    isCorrect: Boolean,
    pointsEarned: {
      type: Number,
      default: 0
    },
    timeSpent: Number // in seconds
  }],
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned', 'timed_out'],
    default: 'in_progress'
  },
  attemptNumber: {
    type: Number,
    required: true
  },
  feedback: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    aiGenerated: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Calculate score and percentage
quizAttemptSchema.methods.calculateScore = function() {
  const totalPoints = this.answers.reduce((sum, answer) => sum + answer.pointsEarned, 0);
  const maxPoints = this.quiz.questions.reduce((sum, question) => sum + question.points, 0);
  
  this.score = totalPoints;
  this.percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  this.correctAnswers = this.answers.filter(answer => answer.isCorrect).length;
  
  return this.save();
};

// Complete the attempt
quizAttemptSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.timeSpent = Math.round((this.completedAt - this.startedAt) / 1000);
  
  return this.calculateScore();
};

// Get attempt summary
quizAttemptSchema.methods.getSummary = function() {
  return {
    score: this.score,
    percentage: this.percentage,
    correctAnswers: this.correctAnswers,
    totalQuestions: this.totalQuestions,
    timeSpent: this.timeSpent,
    status: this.status,
    feedback: this.feedback
  };
};

export default mongoose.model('QuizAttempt', quizAttemptSchema);