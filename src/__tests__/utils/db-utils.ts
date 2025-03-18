import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Prevent mongoose from using the default connection from src/lib/db.ts
// Create a new mongoose instance for tests
const { Schema } = mongoose;
// Disconnect from any existing connection first
mongoose.connections.forEach(conn => {
  if (conn.readyState !== 0) {
    conn.close();
  }
});

// MongoDB Memory Server setup
let mongoMemoryServer: MongoMemoryServer;

// Define schemas
const QueueSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the queue'],
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


const MessageSchema = new Schema({
  queueId: {
    type: Schema.Types.ObjectId,
    ref: 'Queue',
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  processed: {
    type: Boolean,
    default: false,
  },
  visibilityTimeout: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Connect to an in-memory MongoDB for testing
export const connect = async () => {
  try {
    // Create the in-memory MongoDB server
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    
    // Connect with a unique connection instance for tests
    await mongoose.connect(uri);

    // Clear existing models to prevent overwrite errors
    Object.keys(mongoose.models).forEach(key => {
      delete mongoose.models[key];
    });

    // Create models
    const Queue = mongoose.model('Queue', QueueSchema);
    const Message = mongoose.model('Message', MessageSchema);
    
    // Create indexes in the background
    await Queue.createIndexes();
  } catch (error) {
    console.error('Failed to connect to in-memory MongoDB', error);
    throw error;
  }
};

// Clear all data between tests
export const clearDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

// Disconnect and close MongoDB after all tests
export const closeDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

// Export models for testing
export const getModels = () => {
  try {
    return {
      Queue: mongoose.model('Queue'),
      Message: mongoose.model('Message')
    };
  } catch (error) {
    // If models are not registered yet, connect and then try again
    console.error('Models not registered yet, please make sure connect() was called first');
    throw error;
  }
}; 