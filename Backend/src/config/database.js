import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    // Set mongoose options for better connection handling
    mongoose.set('strictQuery', false);
    
    // Use local MongoDB if MONGODB_URI is not set
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edumate';
    
    const conn = await mongoose.connect(mongoURI, {
      // Modern Mongoose connection options (v6+)
      serverSelectionTimeoutMS: 15000, // Timeout for server selection
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      retryWrites: true, // Retry writes on network errors
      retryReads: true, // Retry reads on network errors
      connectTimeoutMS: 10000, // Connection timeout
      heartbeatFrequencyMS: 10000, // Heartbeat frequency
      // Remove deprecated options: useNewUrlParser, useUnifiedTopology, bufferMaxEntries, bufferCommands
    });

    logger.info(`MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    mongoose.connection.on('connecting', () => {
      logger.info('Connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Database connection failed:', error.message);
    
    // Retry connection after 5 seconds
    setTimeout(() => {
      logger.info('Retrying database connection in 5 seconds...');
      connectDB();
    }, 5000);
  }
};

// Function to check if MongoDB is running
const checkMongoConnection = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edumate';
    logger.info(`Attempting to connect to MongoDB at: ${mongoURI}`);
    
    // Test connection
    const testConnection = await mongoose.createConnection(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    
    await testConnection.close();
    logger.info('MongoDB connection test successful');
    return true;
  } catch (error) {
    logger.error('MongoDB connection test failed:', error.message);
    logger.info('Make sure MongoDB is running on your system:');
    logger.info('- Install MongoDB: https://www.mongodb.com/try/download/community');
    logger.info('- Start MongoDB service: mongod --dbpath /path/to/data');
    logger.info('- Or use MongoDB Atlas cloud database');
    return false;
  }
};

export { connectDB as default, checkMongoConnection };