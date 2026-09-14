import mongoose from 'mongoose';
import config from './environment.js';
import logger from '../utils/logger.js';

let isConnected = false;

/**
 * Connect to MongoDB with graceful error handling and retry support
 */
export const connectDB = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  const uri = config.mongodbUri;
  if (!uri) {
    logger.warn('MONGODB_URI is not set. Database persistence will be unavailable.');
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    isConnected = true;
    logger.info(`MongoDB connected successfully: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost. Reconnecting...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected.');
      isConnected = true;
    });

    return conn;
  } catch (error) {
    isConnected = false;
    logger.error(`MongoDB connection failed: ${error.message}`);
    logger.warn('Authentication and user persistence require a working MongoDB connection.');
    return null;
  }
};

/**
 * Check if MongoDB connection is ready
 */
export const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

export default connectDB;
