import mongoose from 'mongoose';

const aiAgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['tutor', 'quiz_generator', 'study_planner', 'content_analyzer', 'progress_tracker'],
    required: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  capabilities: [{
    type: String,
    enum: [
      'question_answering',
      'content_generation',
      'quiz_creation',
      'study_plan_generation',
      'progress_analysis',
      'personalized_recommendations',
      'content_summarization',
      'difficulty_assessment'
    ]
  }],
  configuration: {
    provider: {
      type: String,
      enum: ['openai', 'agentica', 'custom'],
      required: true
    },
    model: {
      type: String,
      required: true
    },
    apiEndpoint: String,
    parameters: {
      temperature: { type: Number, default: 0.7 },
      maxTokens: { type: Number, default: 1000 },
      topP: { type: Number, default: 1 },
      frequencyPenalty: { type: Number, default: 0 },
      presencePenalty: { type: Number, default: 0 }
    },
    systemPrompt: {
      type: String,
      required: true
    },
    contextWindow: { type: Number, default: 4000 }
  },
  permissions: {
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    allowedRoles: [{
      type: String,
      enum: ['student', 'instructor', 'admin']
    }],
    isPublic: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: false }
  },
  usage: {
    totalInteractions: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // in milliseconds
    successRate: { type: Number, default: 100 },
    lastUsed: Date
  },
  rateLimits: {
    requestsPerMinute: { type: Number, default: 10 },
    requestsPerHour: { type: Number, default: 100 },
    requestsPerDay: { type: Number, default: 1000 }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  version: {
    type: String,
    default: '1.0.0'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'deprecated'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Update usage statistics
aiAgentSchema.methods.updateUsage = function(tokensUsed, responseTime, success = true) {
  this.usage.totalInteractions += 1;
  this.usage.totalTokensUsed += tokensUsed;
  this.usage.lastUsed = new Date();
  
  // Update average response time
  const totalResponseTime = this.usage.averageResponseTime * (this.usage.totalInteractions - 1) + responseTime;
  this.usage.averageResponseTime = Math.round(totalResponseTime / this.usage.totalInteractions);
  
  // Update success rate
  const totalSuccesses = Math.round((this.usage.successRate / 100) * (this.usage.totalInteractions - 1)) + (success ? 1 : 0);
  this.usage.successRate = Math.round((totalSuccesses / this.usage.totalInteractions) * 100);
  
  return this.save();
};

// Check if user can access this agent
aiAgentSchema.methods.canAccess = function(user) {
  if (!this.isActive || this.status !== 'active') {
    return false;
  }
  
  if (this.permissions.isPublic) {
    return true;
  }
  
  if (this.permissions.allowedRoles.includes(user.role)) {
    return true;
  }
  
  if (this.permissions.allowedUsers.includes(user._id)) {
    return true;
  }
  
  return false;
};

export default mongoose.model('AIAgent', aiAgentSchema);