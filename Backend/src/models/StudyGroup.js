import mongoose from 'mongoose';

const studyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Study group name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
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
  topics: [{
    type: String,
    trim: true
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  settings: {
    maxMembers: {
      type: Number,
      default: 50,
      min: [2, 'Group must allow at least 2 members']
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowMemberInvites: {
      type: Boolean,
      default: true
    }
  },
  schedule: {
    meetingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    meetingTime: String, // Format: "HH:MM"
    timezone: {
      type: String,
      default: 'UTC'
    },
    duration: Number, // in minutes
    nextSession: Date,
    recurringPattern: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'weekly'
    }
  },
  sessions: [{
    title: String,
    description: String,
    scheduledAt: Date,
    duration: Number, // in minutes
    meetingLink: String,
    joinCode: String,
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    liveStartedAt: Date,
    endedAt: Date,
    attendees: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      joinedAt: Date,
      leftAt: Date,
      duration: Number // in minutes
    }],
    recording: {
      available: { type: Boolean, default: false },
      url: String,
      duration: Number
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  chat: {
    enabled: { type: Boolean, default: true },
    messages: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
      },
      type: {
        type: String,
        enum: ['text', 'file', 'image', 'system'],
        default: 'text'
      },
      attachments: [{
        filename: String,
        url: String,
        size: Number,
        mimeType: String
      }],
      edited: { type: Boolean, default: false },
      editedAt: Date,
      reactions: [{
        emoji: String,
        users: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }]
      }],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  resources: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['link', 'file', 'note', 'quiz'],
      required: true
    },
    url: String,
    content: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  discussions: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    replies: [{
      content: {
        type: String,
        required: true
      },
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }],
    tags: [String],
    isPinned: {
      type: Boolean,
      default: false
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  stats: {
    totalMembers: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
    totalDiscussions: { type: Number, default: 0 },
    totalResources: { type: Number, default: 0 }
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Add member to group
studyGroupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this group');
  }
  
  if (this.members.length >= this.settings.maxMembers) {
    throw new Error('Group has reached maximum member limit');
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
    isActive: true
  });
  
  this.updateStats();
  return this.save();
};

// Remove member from group
studyGroupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  this.updateStats();
  return this.save();
};

// Update group statistics
studyGroupSchema.methods.updateStats = function() {
  this.stats.totalMembers = this.members.length;
  this.stats.activeMembers = this.members.filter(member => member.isActive).length;
  this.stats.totalDiscussions = this.discussions.length;
  this.stats.totalResources = this.resources.length;
};

// Check if user is member
studyGroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Get member role
studyGroupSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Schedule a new session
studyGroupSchema.methods.scheduleSession = function(sessionData, createdBy) {
  const session = {
    title: sessionData.title,
    description: sessionData.description,
    scheduledAt: new Date(sessionData.scheduledAt),
    duration: sessionData.duration || 60,
    meetingLink: this.generateMeetingLink(),
    joinCode: this.generateJoinCode(),
    createdBy: createdBy,
    attendees: []
  };
  
  this.sessions.push(session);
  
  // Update next session if this is the earliest upcoming session
  const now = new Date();
  const upcomingSessions = this.sessions
    .filter(s => s.scheduledAt > now && s.status === 'scheduled')
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
  
  if (upcomingSessions.length > 0) {
    this.schedule.nextSession = upcomingSessions[0].scheduledAt;
  }
  
  return this.save();
};

// Generate meeting link (placeholder - would integrate with actual video service)
studyGroupSchema.methods.generateMeetingLink = function() {
  const roomId = Math.random().toString(36).substring(2, 15);
  return `https://meet.studyai.com/room/${roomId}`;
};

// Generate a short join code
studyGroupSchema.methods.generateJoinCode = function() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

// Add chat message
studyGroupSchema.methods.addChatMessage = function(userId, content, type = 'text') {
  const message = {
    user: userId,
    content,
    type,
    createdAt: new Date()
  };
  
  this.chat.messages.push(message);
  
  // Keep only last 1000 messages
  if (this.chat.messages.length > 1000) {
    this.chat.messages = this.chat.messages.slice(-1000);
  }
  
  return this.save();
};

// Join session
studyGroupSchema.methods.joinSession = function(sessionId, userId) {
  const session = this.sessions.id(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  const existingAttendee = session.attendees.find(a => 
    a.user.toString() === userId.toString()
  );
  
  if (!existingAttendee) {
    session.attendees.push({
      user: userId,
      joinedAt: new Date()
    });
  }
  
  // Update session status to live if it's the scheduled time
  const now = new Date();
  if (session.scheduledAt <= now && session.status === 'scheduled') {
    session.status = 'live';
    session.liveStartedAt = session.liveStartedAt || now;
  }
  
  return this.save();
};

// End session (creator only)
studyGroupSchema.methods.endSession = function(sessionId, endedBy) {
  const session = this.sessions.id(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  // Only group creator can end a session
  if (this.creator.toString() !== endedBy.toString()) {
    throw new Error('Only the group creator can end sessions');
  }
  session.status = 'completed';
  session.endedAt = new Date();
  // Optionally mark attendees leftAt if not set
  session.attendees = (session.attendees || []).map(a => ({
    ...a.toObject ? a.toObject() : a,
    leftAt: a.leftAt || new Date()
  }));
  return this.save();
};

export default mongoose.model('StudyGroup', studyGroupSchema);