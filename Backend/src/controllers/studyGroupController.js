import StudyGroup from '../models/StudyGroup.js';
import logger from '../utils/logger.js';

class StudyGroupController {
  // Create a new study group
  async createStudyGroup(req, res) {
    try {
      const { name, description, subject, privacy, maxMembers, tags } = req.body;

      if (!name || !subject) {
        return res.status(400).json({
          success: false,
          message: 'Name and subject are required'
        });
      }

      const studyGroup = new StudyGroup({
        name,
        description,
        subject,
        tags: tags || [],
        creator: req.userId,
        members: [{
          user: req.userId,
          role: 'admin'
        }],
        settings: {
          maxMembers: maxMembers || 50,
          isPrivate: privacy === 'private' || false
        }
      });

      await studyGroup.save();

      // Populate creator info
      await studyGroup.populate('creator', 'name email');
      await studyGroup.populate('members.user', 'name email');

      logger.info(`Study group created: ${name} by user ${req.userId}`);

      res.status(201).json({
        success: true,
        group: studyGroup
      });
    } catch (error) {
      logger.error('Create study group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get all study groups (with filters)
  async getStudyGroups(req, res) {
    try {
      const { subject, privacy, search } = req.query;
      const filter = {};

      // Apply filters
      if (subject) filter.subject = new RegExp(subject, 'i');
      if (privacy) filter.privacy = privacy;
      if (search) {
        filter.$or = [
          { name: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const studyGroups = await StudyGroup.find(filter)
        .populate('creator', 'name email')
        .populate('members.user', 'name email')
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({
        success: true,
        groups: studyGroups
      });
    } catch (error) {
      logger.error('Get study groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get a specific study group
  async getStudyGroup(req, res) {
    try {
      const { id } = req.params;

      const studyGroup = await StudyGroup.findById(id)
        .populate('creator', 'name email')
        .populate('members.user', 'name email');

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      res.json({
        success: true,
        group: studyGroup
      });
    } catch (error) {
      logger.error('Get study group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Join a study group
  async joinStudyGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if already a member
      if (studyGroup.members.some(member => member.user.toString() === userId)) {
        return res.status(400).json({
          success: false,
          message: 'Already a member of this group'
        });
      }

      // Check if group is full
      if (studyGroup.members.length >= studyGroup.settings.maxMembers) {
        return res.status(400).json({
          success: false,
          message: 'Study group is full'
        });
      }

      // Check privacy
      if (studyGroup.settings.isPrivate) {
        return res.status(403).json({
          success: false,
          message: 'This is a private group. You need an invitation to join.'
        });
      }

      // Add user to group
      studyGroup.members.push({
        user: userId,
        role: 'member'
      });
      await studyGroup.save();

      await studyGroup.populate('creator', 'name email');
      await studyGroup.populate('members.user', 'name email');

      logger.info(`User ${userId} joined study group ${id}`);

      res.json({
        success: true,
        group: studyGroup,
        message: 'Successfully joined the study group'
      });
    } catch (error) {
      logger.error('Join study group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Leave a study group
  async leaveStudyGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is a member
      if (!studyGroup.members.some(member => member.user.toString() === userId)) {
        return res.status(400).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      // Check if user is the creator
      if (studyGroup.creator.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Group creator cannot leave. Transfer ownership or delete the group.'
        });
      }

      // Remove user from group
      studyGroup.members = studyGroup.members.filter(member => member.user.toString() !== userId);
      await studyGroup.save();

      logger.info(`User ${userId} left study group ${id}`);

      res.json({
        success: true,
        message: 'Successfully left the study group'
      });
    } catch (error) {
      logger.error('Leave study group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update study group
  async updateStudyGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is admin or creator
      const isAdmin = studyGroup.members.some(member => 
        member.user.toString() === userId && (member.role === 'admin' || member.role === 'moderator')
      );
      if (!isAdmin && studyGroup.creator.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update the group'
        });
      }

      // Update allowed fields
      const allowedUpdates = ['name', 'description', 'subject', 'tags'];
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          studyGroup[field] = updates[field];
        }
      });

      // Handle settings updates
      if (updates.privacy !== undefined) {
        studyGroup.settings.isPrivate = updates.privacy === 'private';
      }
      if (updates.maxMembers !== undefined) {
        studyGroup.settings.maxMembers = updates.maxMembers;
      }

      await studyGroup.save();
      await studyGroup.populate('creator', 'name email');
      await studyGroup.populate('members.user', 'name email');

      logger.info(`Study group ${id} updated by user ${userId}`);

      res.json({
        success: true,
        group: studyGroup
      });
    } catch (error) {
      logger.error('Update study group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete study group
  async deleteStudyGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is the creator
      if (studyGroup.creator.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the creator can delete the group'
        });
      }

      await StudyGroup.findByIdAndDelete(id);

      logger.info(`Study group ${id} deleted by user ${userId}`);

      res.json({
        success: true,
        message: 'Study group deleted successfully'
      });
    } catch (error) {
      logger.error('Delete study group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's study groups
  async getUserStudyGroups(req, res) {
    try {
      const userId = req.userId;

      const studyGroups = await StudyGroup.find({
        'members.user': userId
      })
        .populate('creator', 'name email')
        .populate('members.user', 'name email')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        groups: studyGroups
      });
    } catch (error) {
      logger.error('Get user study groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Schedule a session
  async scheduleSession(req, res) {
    try {
      const { id } = req.params;
      const { title, description, scheduledAt, duration } = req.body;
      const userId = req.userId;
      
      const studyGroup = await StudyGroup.findById(id);
      
      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }
      
      // Only group creator can schedule sessions
      if (studyGroup.creator.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only the group creator can schedule sessions'
        });
      }
      
      await studyGroup.scheduleSession({
        title,
        description,
        scheduledAt,
        duration: duration || 60
      }, userId);
      
      await studyGroup.populate('creator', 'name email');
      await studyGroup.populate('members.user', 'name email');
      
      res.json({
        success: true,
        message: 'Session scheduled successfully',
        group: studyGroup
      });
    } catch (error) {
      logger.error('Schedule session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // End a session (creator only)
  async endSession(req, res) {
    try {
      const { id, sessionId } = req.params;
      const userId = req.userId;
      
      const studyGroup = await StudyGroup.findById(id);
      if (!studyGroup) {
        return res.status(404).json({ success: false, message: 'Study group not found' });
      }
      
      // Only group creator can end sessions
      if (studyGroup.creator.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Only the group creator can end sessions' });
      }
      
      await studyGroup.endSession(sessionId, userId);
      const session = studyGroup.sessions.id(sessionId);
      
      // Notify participants via Socket.IO
      req.io.to(`study-session-${sessionId}`).emit('session-ended', { groupId: id, sessionId });
      req.io.to(`study-group-${id}`).emit('session-status-update', { sessionId, status: 'completed' });
      
      res.json({ success: true, message: 'Session ended', session });
    } catch (error) {
      logger.error('End session error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Join a session by code
  async joinSessionByCode(req, res) {
    try {
      const { code } = req.body;
      const userId = req.userId;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, message: 'Join code is required' });
      }
      
      const studyGroup = await StudyGroup.findOne({ 'sessions.joinCode': code });
      if (!studyGroup) {
        return res.status(404).json({ success: false, message: 'Session with this code not found' });
      }
      
      const session = (studyGroup.sessions || []).find(s => s.joinCode === code);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      
      // Allow anyone to join via code if the session is live or it is time
      await studyGroup.joinSession(session._id, userId);
      
      res.json({
        success: true,
        groupId: studyGroup._id,
        sessionId: session._id,
        meetingLink: session.meetingLink,
        session
      });
    } catch (error) {
      logger.error('Join session by code error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get a session details
  async getSession(req, res) {
    try {
      const { id, sessionId } = req.params;
      const studyGroup = await StudyGroup.findById(id);
      if (!studyGroup) {
        return res.status(404).json({ success: false, message: 'Study group not found' });
      }
      const session = studyGroup.sessions.id(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      res.json({
        success: true,
        session: {
          id: session._id,
          title: session.title,
          scheduledAt: session.scheduledAt,
          duration: session.duration,
          meetingLink: session.meetingLink,
          joinCode: session.joinCode,
          status: session.status,
          createdBy: session.createdBy,
          liveStartedAt: session.liveStartedAt,
          endedAt: session.endedAt
        }
      });
    } catch (error) {
      logger.error('Get session error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  
  // Join a session
  async joinSession(req, res) {
    try {
      const { id, sessionId } = req.params;
      const userId = req.userId;
      
      const studyGroup = await StudyGroup.findById(id);
      
      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }
      
      // Check if user is a member
      if (!studyGroup.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member to join sessions'
        });
      }
      
      await studyGroup.joinSession(sessionId, userId);
      
      const session = studyGroup.sessions.id(sessionId);
      
      res.json({
        success: true,
        message: 'Joined session successfully',
        meetingLink: session.meetingLink,
        session
      });
    } catch (error) {
      logger.error('Join session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Send chat message
  async sendChatMessage(req, res) {
    try {
      const { id } = req.params;
      const { content, type = 'text' } = req.body;
      const userId = req.userId;
      
      const studyGroup = await StudyGroup.findById(id);
      
      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }
      
      // Check if user is a member
      if (!studyGroup.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member to send messages'
        });
      }
      
      await studyGroup.addChatMessage(userId, content, type);
      
      // Get the latest message with user info
      await studyGroup.populate('chat.messages.user', 'firstName lastName username');
      const latestMessage = studyGroup.chat.messages[studyGroup.chat.messages.length - 1];
      
      // Emit to all group members via Socket.IO
      req.io.to(`study-group-${id}`).emit('new-message', {
        groupId: id,
        message: latestMessage
      });
      
      res.json({
        success: true,
        message: latestMessage
      });
    } catch (error) {
      logger.error('Send chat message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Get chat messages
  async getChatMessages(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, before } = req.query;
      const userId = req.userId;
      
      const studyGroup = await StudyGroup.findById(id)
        .populate('chat.messages.user', 'firstName lastName username');
      
      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }
      
      // Check if user is a member
      if (!studyGroup.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member to view messages'
        });
      }
      
      let messages = studyGroup.chat.messages;
      
      // Filter messages before a certain date if specified
      if (before) {
        messages = messages.filter(msg => msg.createdAt < new Date(before));
      }
      
      // Get latest messages
      messages = messages.slice(-limit);
      
      res.json({
        success: true,
        messages
      });
    } catch (error) {
      logger.error('Get chat messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default new StudyGroupController();