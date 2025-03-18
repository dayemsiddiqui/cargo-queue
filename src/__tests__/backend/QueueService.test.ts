import { connect, clearDatabase, closeDatabase, getModels } from '../utils/db-utils';
import { queueService } from '@/lib/services/QueueService';
import mongoose from 'mongoose';
import { ApiError } from '@/lib/errors/ApiError';

describe('QueueService', () => {
  let testQueueId: mongoose.Types.ObjectId;
  let testQueueSlug: string;

  // Setup and teardown
  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    // Create a test queue for each test
    const { Queue } = getModels();
    const queue = await Queue.create({ name: 'Test Queue', slug: 'test-queue' });
    testQueueId = queue._id;
    testQueueSlug = queue.slug;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('sendMessage', () => {
    it('should send a message to an existing queue', async () => {
      // Act
      const message = await queueService.sendMessage(testQueueSlug, 'Test message content');

      // Assert
      expect(message).toBeDefined();
      expect(message.body).toBe('Test message content');
      expect(message.queueId.toString()).toBe(testQueueId.toString());
      expect(message.processed).toBe(false);

      // Verify message was added to database
      const { Message } = getModels();
      const savedMessage = await Message.findById(message._id);
      expect(savedMessage).toBeDefined();
      expect(savedMessage!.body).toBe('Test message content');
    });

    it('should throw ApiError if queue does not exist', async () => {
      // Act & Assert
      await expect(queueService.sendMessage('non-existent-queue', 'Test message'))
        .rejects.toThrow(ApiError);
      
      // Verify the error details
      try {
        await queueService.sendMessage('non-existent-queue', 'Test message');
      } catch (error) {
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(404);
          expect(error.message).toBe('Queue not found');
        }
      }
    });
  });

  describe('pollMessage', () => {
    it('should return the oldest unprocessed message from the queue', async () => {
      // Arrange
      const { Message } = getModels();
      
      // Create two messages with different timestamps
      await Message.create({
        queueId: testQueueId,
        body: 'Old message',
        createdAt: new Date(Date.now() - 5000),
        processed: false
      });
      
      await Message.create({
        queueId: testQueueId,
        body: 'New message',
        createdAt: new Date(),
        processed: false
      });

      // Act
      const message = await queueService.pollMessage(testQueueSlug);

      // Assert
      expect(message).toBeDefined();
      expect(message!.body).toBe('Old message');
    });

    it('should return null if no unprocessed messages exist', async () => {
      // Act
      const message = await queueService.pollMessage(testQueueSlug);

      // Assert
      expect(message).toBeNull();
    });

    it('should throw ApiError if queue does not exist', async () => {
      // Act & Assert
      await expect(queueService.pollMessage('non-existent-queue'))
        .rejects.toThrow(ApiError);
      
      // Verify the error details
      try {
        await queueService.pollMessage('non-existent-queue');
      } catch (error) {
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(404);
          expect(error.message).toContain('not found');
        }
      }
    });

    it('should not return processed messages', async () => {
      // Arrange
      const { Message } = getModels();
      
      // Create one processed (old) and one unprocessed (new) message
      await Message.create({
        queueId: testQueueId,
        body: 'Processed message',
        createdAt: new Date(Date.now() - 10000),
        processed: true
      });
      
      const unprocessedMessage = await Message.create({
        queueId: testQueueId,
        body: 'Unprocessed message',
        createdAt: new Date(),
        processed: false
      });

      // Act
      const message = await queueService.pollMessage(testQueueSlug);

      // Assert
      expect(message).toBeDefined();
      expect(message!.body).toBe('Unprocessed message');
    });
  });

  describe('acknowledgeMessage', () => {
    it('should mark a message as processed', async () => {
      // Arrange
      const { Message } = getModels();
      const message = await Message.create({
        queueId: testQueueId,
        body: 'Message to acknowledge',
        processed: false
      });

      // Act
      const acknowledgedMessage = await queueService.acknowledgeMessage(message._id.toString());

      // Assert
      expect(acknowledgedMessage).toBeDefined();
      expect(acknowledgedMessage.processed).toBe(true);

      // Verify in database
      const updatedMessage = await Message.findById(message._id);
      expect(updatedMessage!.processed).toBe(true);
    });

    it('should throw ApiError if message does not exist', async () => {
      // Act & Assert
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await expect(queueService.acknowledgeMessage(nonExistentId))
        .rejects.toThrow(ApiError);
      
      // Verify the error details
      try {
        await queueService.acknowledgeMessage(nonExistentId);
      } catch (error) {
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(404);
          expect(error.message).toBe('Message not found');
        }
      }
    });
  });

  describe('Integration tests', () => {
    it('should allow sending, polling, and acknowledging a message', async () => {
      // Step 1: Send a message
      const sentMessage = await queueService.sendMessage(testQueueSlug, 'Integration test message');
      expect(sentMessage).toBeDefined();
      expect(sentMessage.processed).toBe(false);
      
      // Step 2: Poll the message
      const polledMessage = await queueService.pollMessage(testQueueSlug);
      expect(polledMessage).toBeDefined();
      expect(polledMessage!._id.toString()).toBe(sentMessage._id.toString());
      expect(polledMessage!.processed).toBe(false);
      
      // Step 3: Acknowledge the message
      const acknowledgedMessage = await queueService.acknowledgeMessage(polledMessage!._id.toString());
      expect(acknowledgedMessage).toBeDefined();
      expect(acknowledgedMessage.processed).toBe(true);
      
      // Step 4: Poll again - should return null as all messages are processed
      const noMessage = await queueService.pollMessage(testQueueSlug);
      expect(noMessage).toBeNull();
    });
  });
}); 