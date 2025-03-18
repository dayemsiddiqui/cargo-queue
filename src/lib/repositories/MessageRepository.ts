import { Message } from '../models/Queue';
import mongoose from 'mongoose';

export class MessageRepository {
  async create(data: { 
    queueId: mongoose.Types.ObjectId | string; 
    body: string;
    expiresAt?: Date | null;
  }) {
    return Message.create(data);
  }

  async findOldestUnprocessed(queueId: mongoose.Types.ObjectId | string) {
    return Message.findOne({
      queueId,
      processed: false
    }).sort({ createdAt: 1 }); // Get the oldest message first
  }

  async markAsProcessed(messageId: string) {
    return Message.findByIdAndUpdate(
      messageId,
      { processed: true },
      { new: true }
    );
  }

  async findById(id: string) {
    return Message.findById(id);
  }

  async deleteByQueueId(queueId: mongoose.Types.ObjectId | string) {
    return Message.deleteMany({ queueId });
  }
}

// Singleton instance
export const messageRepository = new MessageRepository(); 