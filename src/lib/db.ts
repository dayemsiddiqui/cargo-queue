import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cargo-queue';

// Connection options with retry
const options = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  retryWrites: true,
};

// Create connection function with retry logic
const connectDB = async () => {
  try {
    if (!mongoose.connections[0].readyState) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI, options);
      console.log('MongoDB connected successfully');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't throw error here to allow the app to start even if MongoDB isn't available yet
  }
};

// Attempt initial connection
connectDB();

// Add event listeners for connection issues
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, trying to reconnect...');
  setTimeout(connectDB, 5000); // Try to reconnect after 5 seconds
});

export default mongoose; 