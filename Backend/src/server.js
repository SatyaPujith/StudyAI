import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import connectDB, { checkMongoConnection } from './config/database.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import apiRoutes from './routes/index.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Socket.IO middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Routes
app.use('/api', apiRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('join-study-group', (groupId) => {
    socket.join(`study-group-${groupId}`);
    logger.info(`User ${socket.id} joined study group ${groupId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Start server with database connection
const startServer = async () => {
  try {
    // Check MongoDB connection first
    logger.info('Checking MongoDB connection...');
    const isMongoAvailable = await checkMongoConnection();
    
    if (!isMongoAvailable) {
      logger.warn('MongoDB connection test failed, but attempting to connect anyway...');
    }
    
    // Connect to MongoDB
    await connectDB();
    
    // Start the server after successful database connection
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info('📊 Database connected and server ready to accept requests');
      logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    logger.info('💡 Troubleshooting tips:');
    logger.info('   1. Make sure MongoDB is installed and running');
    logger.info('   2. Check your MONGODB_URI in .env file');
    logger.info('   3. Verify MongoDB service is started');
    process.exit(1);
  }
};

startServer();

export default app;