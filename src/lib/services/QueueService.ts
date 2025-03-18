import { queueRepository } from '@/lib/repositories/QueueRepository';
import { messageRepository } from '@/lib/repositories/MessageRepository';
import { ApiError } from '@/lib/errors/ApiError';

export class QueueService {
  async sendMessage(slug: string, messageBody: string) {
    // Find the queue
    const queue = await queueRepository.findBySlug(slug);
    if (!queue) {
      throw ApiError.notFound(`Queue not found`);
    }

    // Create a new message
    const newMessage = await messageRepository.create({
      queueId: queue._id,
      body: messageBody,
    });

    return newMessage;
  }

  async pollMessage(slug: string) {
    // Find the queue
    const queue = await queueRepository.findBySlug(slug);
    if (!queue) {
      throw ApiError.notFound(`Queue with slug '${slug}' not found`);
    }

    // Get the oldest unprocessed message
    const message = await messageRepository.findOldestUnprocessed(queue._id);
    return message;
  }

  async acknowledgeMessage(messageId: string) {
    // Mark message as processed
    const message = await messageRepository.markAsProcessed(messageId);
    if (!message) {
      throw ApiError.notFound(`Message not found`);
    }
    
    return message;
  }
}

// Create a singleton instance
export const queueService = new QueueService(); 