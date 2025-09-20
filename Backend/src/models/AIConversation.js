import mongoose from 'mongoose';

const aiConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIAgent',
    required: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  context: {
    studyPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan'
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    subject: String,
    topic: String,
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    }
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    metadata: {
      tokensUsed: Number,
      responseTime: Number, // in milliseconds
      model: String,
      temperature: Number,
      timestamp: {
        type: Date,
        default: Date.now
      }
    },
    attachments: [{
      type: {
        type: String,
        enum: ['file', 'image', 'link', 'quiz_result']
      },
      name: String,
      url: String,
      size: Number,
      mimeType: String
    }],
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      helpful: Boolean
    }
  }],
  summary: {
    totalMessages: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    topicsDiscussed: [String],
    keyInsights: [String]
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add message to conversation
aiConversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  const message = {
    role,
    content,
    metadata: {
      ...metadata,
      timestamp: new Date()
    }
  };
  
  this.messages.push(message);
  this.lastActivity = new Date();
  this.updateSummary();
  
  return this.save();
};

// Update conversation summary
aiConversationSchema.methods.updateSummary = function() {
  this.summary.totalMessages = this.messages.length;
  this.summary.totalTokensUsed = this.messages.reduce((total, msg) => 
    total + (msg.metadata.tokensUsed || 0), 0
  );
  
  const responseTimes = this.messages
    .filter(msg => msg.metadata.responseTime)
    .map(msg => msg.metadata.responseTime);
  
  if (responseTimes.length > 0) {
    this.summary.averageResponseTime = Math.round(
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    );
  }
};

// Get conversation context for AI
aiConversationSchema.methods.getContext = function(maxMessages = 10) {
  const recentMessages = this.messages
    .slice(-maxMessages)
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  
  return {
    messages: recentMessages,
    context: this.context,
    summary: this.summary
  };
};

// Archive old conversations
aiConversationSchema.statics.archiveOldConversations = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.updateMany(
    { 
      lastActivity: { $lt: cutoffDate },
      status: 'active'
    },
    { status: 'archived' }
  );
};

export default mongoose.model('AIConversation', aiConversationSchema);