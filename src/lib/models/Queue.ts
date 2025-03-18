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
  retentionPeriod: {
    type: Number,
    default: null, // null means messages are kept indefinitely
    description: 'Retention period in seconds. Null means keep indefinitely.',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Transform the document to always include retentionPeriod even if null
QueueSchema.set('toJSON', {
  transform: function (doc, ret) {
    // Ensure retentionPeriod is explicitly set to null if undefined or 0
    if (ret.retentionPeriod === undefined || ret.retentionPeriod === 0) {
      ret.retentionPeriod = null;
    }
    return ret;
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
  expiresAt: {
    type: Date,
    default: null, // null means the document won't expire
    index: { expires: 0 } // TTL index that automatically removes documents when expiresAt is reached
  }
});

// Create or retrieve models
export const Queue = mongoose.models.Queue || mongoose.model('Queue', QueueSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema); 