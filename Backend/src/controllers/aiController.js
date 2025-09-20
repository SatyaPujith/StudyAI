import AIConversation from '../models/AIConversation.js';
import AIAgent from '../models/AIAgent.js';
import aiService from '../services/aiService.js';
import logger from '../utils/logger.js';

class AIController {
  async chat(req, res) {
    try {
      const { message, conversationId, agentId } = req.body;

      let conversation;
      if (conversationId) {
        conversation = await AIConversation.findOne({
          _id: conversationId,
          userId: req.userId
        });
      }

      if (!conversation) {
        conversation = new AIConversation({
          userId: req.userId,
          agentId: agentId || null,
          messages: []
        });
      }

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Get AI response
      const context = {
        conversationHistory: conversation.messages.slice(-10), // Last 10 messages
        userId: req.userId
      };

      const aiResponse = await aiService.continueConversation(
        conversation.messages,
        context
      );

      if (!aiResponse.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to get AI response'
        });
      }

      // Add AI response
      conversation.messages.push({
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date()
      });

      conversation.lastActivity = new Date();
      await conversation.save();

      res.json({
        success: true,
        message: aiResponse.content,
        conversationId: conversation._id
      });
    } catch (error) {
      logger.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getConversations(req, res) {
    try {
      const conversations = await AIConversation.find({ userId: req.userId })
        .populate('agentId', 'name description')
        .sort({ lastActivity: -1 })
        .limit(50);

      res.json({
        success: true,
        conversations
      });
    } catch (error) {
      logger.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getConversation(req, res) {
    try {
      const { id } = req.params;
      
      const conversation = await AIConversation.findOne({
        _id: id,
        userId: req.userId
      }).populate('agentId', 'name description');

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        conversation
      });
    } catch (error) {
      logger.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async deleteConversation(req, res) {
    try {
      const { id } = req.params;
      
      const conversation = await AIConversation.findOneAndDelete({
        _id: id,
        userId: req.userId
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (error) {
      logger.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async createAgent(req, res) {
    try {
      const { name, description, personality, expertise, instructions } = req.body;

      const agent = new AIAgent({
        name,
        description,
        personality,
        expertise,
        instructions,
        createdBy: req.userId
      });

      await agent.save();

      res.status(201).json({
        success: true,
        message: 'AI agent created successfully',
        agent
      });
    } catch (error) {
      logger.error('Create agent error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getAgents(req, res) {
    try {
      const agents = await AIAgent.find({ isActive: true })
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        agents
      });
    } catch (error) {
      logger.error('Get agents error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateAgent(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const agent = await AIAgent.findOneAndUpdate(
        { _id: id, createdBy: req.userId },
        updates,
        { new: true }
      );

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      res.json({
        success: true,
        message: 'Agent updated successfully',
        agent
      });
    } catch (error) {
      logger.error('Update agent error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const healthStatus = await aiService.healthCheck();
      
      res.json({
        success: true,
        services: healthStatus
      });
    } catch (error) {
      logger.error('AI health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default new AIController();