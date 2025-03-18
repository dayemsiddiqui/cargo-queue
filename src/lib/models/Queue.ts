import mongoose from '../db';

// Define the Queue schema
const QueueSchema = new mongoose.Schema({
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

// Define the Message schema
const MessageSchema = new mongoose.Schema({
  queueId: {
    type: mongoose.Schema.Types.ObjectId,
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

// Create or retrieve models
export const Queue = mongoose.models.Queue || mongoose.model('Queue', QueueSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema); 