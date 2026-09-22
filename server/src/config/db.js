const mongoose = require('mongoose');
const { logInfo, logError } = require('./logger');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vista';
  try {
    await mongoose.connect(uri);
    logInfo(`Connected to MongoDB at ${uri}`);
  } catch (err) {
    logError('MongoDB connection error', { error: err.message, stack: err.stack });
    logError('Make sure MongoDB is running locally, or set MONGO_URI to a reachable instance.');
    process.exit(1);
  }
}

module.exports = connectDB;
