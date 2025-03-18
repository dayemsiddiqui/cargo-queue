import { queueRepository } from '@/lib/repositories/QueueRepository';
import { messageRepository } from '@/lib/repositories/MessageRepository';
import { ApiError } from '@/lib/errors/ApiError';
import { Message } from '@/lib/models/Queue';
import { Queue } from '@/lib/models/Queue';

export class QueueService {
  async findAllQueues() {
    return queueRepository.findAll();
  }

  async findQueueBySlug(slug: string) {
    const queue = await queueRepository.findBySlug(slug);
    if (!queue) {
      throw ApiError.notFound(`Queue with slug '${slug}' not found`);
    }
    return queue;
  }

  async updateQueueRetentionPolicy(slug: string, retentionPeriod: number | null) {
    const queue = await queueRepository.findBySlug(slug);
    if (!queue) {
      throw ApiError.notFound(`Queue with slug '${slug}' not found`);
    }
    
    // Force null if the value is 0 or undefined for consistency
    const retentionValue = retentionPeriod === 0 || retentionPeriod === undefined ? null : retentionPeriod;
    
    // Make a direct database update to set the field explicitly
    const updatedQueue = await Queue.findByIdAndUpdate(
      queue._id,
      { $set: { retentionPeriod: retentionValue } },
      { new: true }
    );
    
    // Update expiry for existing messages if retention policy is changed
    if (retentionValue !== null) {
      // Calculate new expiry date based on retentionPeriod
      const now = Date.now();
      const newExpiryDate = new Date(now + retentionValue * 1000);
      
      // Update all messages in this queue
      await Message.updateMany(
        { queueId: queue._id },
        { expiresAt: newExpiryDate }
      );
    } else {
      // If retention policy is removed, clear expiry dates
      await Message.updateMany(
        { queueId: queue._id },
        { expiresAt: null }
      );
    }
    
    return updatedQueue;
  }

  async createQueue(name: string, retentionPeriod?: number | null) {
    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if a queue with this slug already exists
    const existingQueue = await queueRepository.findBySlug(slug);
    if (existingQueue) {
      throw ApiError.badRequest('A queue with this name already exists');
    }
    
    // Create a new queue
    return queueRepository.create({ name, slug, retentionPeriod });
  }

  async sendMessage(slug: string, messageBody: string) {
    // Find the queue
    const queue = await queueRepository.findBySlug(slug);
    if (!queue) {
      throw ApiError.notFound(`Queue not found`);
    }

    // Calculate expiresAt if retention policy is set
    let expiresAt = null;
    if (queue.retentionPeriod) {
      expiresAt = new Date(Date.now() + queue.retentionPeriod * 1000);
    }

    // Create a new message
    const newMessage = await messageRepository.create({
      queueId: queue._id,
      body: messageBody,
      expiresAt,
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