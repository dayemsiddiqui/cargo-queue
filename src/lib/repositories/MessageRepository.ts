import { Message } from '@/lib/models/Queue';
import type { IMessage } from '@/lib/models/types';
import { Types } from 'mongoose';

class MessageRepository {
  async create(messageData: Partial<IMessage>) {
    return Message.create(messageData);
  }

  async findOldestUnprocessed(queueId: string | Types.ObjectId) {
    return Message.findOne({
      queueId,
      processed: false,
      $or: [
        { visibilityTimeout: null },
        { visibilityTimeout: { $lte: new Date() } }
      ]
    }).sort({ createdAt: 1 });
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

  async deleteByQueueId(queueId: string | Types.ObjectId) {
    return Message.deleteMany({ queueId });
  }
}

export const messageRepository = new MessageRepository(); 