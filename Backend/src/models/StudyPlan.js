import mongoose from 'mongoose';

const studyPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Study plan title is required'],
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
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  estimatedDuration: {
    type: Number, // in days
    required: true,
    min: [1, 'Duration must be at least 1 day']
  },
  topics: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: [300, 'Topic description cannot exceed 300 characters']
    },
    order: {
      type: Number,
      required: true
    },
    estimatedTime: {
      type: Number, // in minutes
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    resources: [{
      type: {
        type: String,
        enum: ['video', 'article', 'book', 'practice', 'quiz'],
        required: true
      },
      title: String,
      url: String,
      description: String
    }],
    prerequisites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan.topics'
    }],
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started'
    },
    completedAt: Date,
    notes: String
  }],
  dailyContent: [{
    day: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    objectives: [String],
    content: {
      overview: String,
      keyPoints: [String],
      examples: [String],
      exercises: [String]
    },
    resources: [{
      type: {
        type: String,
        enum: ['video', 'article', 'book', 'practice', 'quiz'],
        required: true
      },
      title: String,
      url: String,
      description: String
    }],
    activities: [{
      type: {
        type: String,
        enum: ['reading', 'practice', 'quiz', 'project', 'review'],
        required: true
      },
      description: String,
      duration: Number, // in minutes
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date
    }],
    assessment: [{
      question: String,
      options: [String],
      correct: Number,
      explanation: String,
      userAnswer: Number,
      isCorrect: Boolean
    }],
    homework: String,
    totalTime: Number, // in minutes
    timeSpent: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    },
    completedAt: Date,
    notes: String
  }],
  progress: {
    completedTopics: { type: Number, default: 0 },
    totalTopics: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 }, // in minutes
    lastStudied: Date
  },
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    studyDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    dailyStudyTime: {
      type: Number, // in minutes
      default: 60
    }
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiPrompt: {
    type: String,
    maxlength: [1000, 'AI prompt cannot exceed 1000 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'paused', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Update progress when topics are modified
studyPlanSchema.methods.updateProgress = function() {
  const completedTopics = this.topics.filter(topic => topic.status === 'completed').length;
  const totalTopics = this.topics.length;
  
  this.progress.completedTopics = completedTopics;
  this.progress.totalTopics = totalTopics;
  this.progress.percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  
  return this.save();
};

// Get next topic to study
studyPlanSchema.methods.getNextTopic = function() {
  return this.topics
    .filter(topic => topic.status === 'not_started')
    .sort((a, b) => a.order - b.order)[0];
};

export default mongoose.model('StudyPlan', studyPlanSchema);