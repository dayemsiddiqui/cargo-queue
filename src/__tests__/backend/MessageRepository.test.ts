import { connect, clearDatabase, closeDatabase, getModels } from '../utils/db-utils';
import { messageRepository } from '@/lib/repositories/MessageRepository';
import mongoose from 'mongoose';

describe('MessageRepository', () => {
  let queueId: mongoose.Types.ObjectId;

  // Setup and teardown
  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Create a test queue to use for message tests
    const { Queue } = getModels();
    const queue = await Queue.create({ name: 'Test Queue', slug: 'test-queue' });
    queueId = queue._id;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('create', () => {
    it('should create a new message', async () => {
      // Act
      const message = await messageRepository.create({
        queueId,
        body: 'Test message'
      });

      // Assert
      expect(message).toBeDefined();
      expect(message.body).toBe('Test message');
      expect(message.queueId.toString()).toBe(queueId.toString());
      expect(message.processed).toBe(false);
    });
  });

  describe('findOldestUnprocessed', () => {
    it('should find the oldest unprocessed message', async () => {
      // Arrange
      const { Message } = getModels();
      // Create messages with different timestamps
      await Message.create({
        queueId,
        body: 'Message 1',
        createdAt: new Date(Date.now() - 3000), // 3 seconds ago
        processed: false
      });
      
      await Message.create({
        queueId,
        body: 'Message 2',
        createdAt: new Date(Date.now() - 1000), // 1 second ago
        processed: false
      });

      // Act
      const message = await messageRepository.findOldestUnprocessed(queueId);

      // Assert
      expect(message).toBeDefined();
      expect(message!.body).toBe('Message 1'); // The oldest message should be returned
    });

    it('should not return processed messages', async () => {
      // Arrange
      const { Message } = getModels();
      // Create oldest message as processed
      await Message.create({
        queueId,
        body: 'Processed message',
        createdAt: new Date(Date.now() - 5000),
        processed: true
      });
      
      // Create newer message as unprocessed
      const newerMessage = await Message.create({
        queueId,
        body: 'Unprocessed message',
        createdAt: new Date(Date.now() - 1000),
        processed: false
      });

      // Act
      const message = await messageRepository.findOldestUnprocessed(queueId);

      // Assert
      expect(message).toBeDefined();
      expect(message!.body).toBe('Unprocessed message');
    });

    it('should return null if no unprocessed messages exist', async () => {
      // Act
      const message = await messageRepository.findOldestUnprocessed(queueId);

      // Assert
      expect(message).toBeNull();
    });
  });

  describe('markAsProcessed', () => {
    it('should mark a message as processed', async () => {
      // Arrange
      const { Message } = getModels();
      const message = await Message.create({
        queueId,
        body: 'Test message',
        processed: false
      });

      // Act
      const updatedMessage = await messageRepository.markAsProcessed(message._id.toString());

      // Assert
      expect(updatedMessage).toBeDefined();
      expect(updatedMessage!.processed).toBe(true);
    });

    it('should return null if message does not exist', async () => {
      // Act
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await messageRepository.markAsProcessed(nonExistentId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find a message by id', async () => {
      // Arrange
      const { Message } = getModels();
      const message = await Message.create({
        queueId,
        body: 'Test message'
      });

      // Act
      const foundMessage = await messageRepository.findById(message._id.toString());

      // Assert
      expect(foundMessage).toBeDefined();
      expect(foundMessage!.body).toBe('Test message');
    });

    it('should return null if message does not exist', async () => {
      // Act
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const message = await messageRepository.findById(nonExistentId);

      // Assert
      expect(message).toBeNull();
    });
  });

  describe('deleteByQueueId', () => {
    it('should delete all messages for a queue', async () => {
      // Arrange
      const { Message } = getModels();
      await Message.create([
        { queueId, body: 'Message 1' },
        { queueId, body: 'Message 2' },
        { queueId, body: 'Message 3' }
      ]);

      // Act
      const result = await messageRepository.deleteByQueueId(queueId);

      // Assert
      expect(result.deletedCount).toBe(3);
      
      // Verify no messages remain
      const remainingMessages = await Message.find({ queueId });
      expect(remainingMessages.length).toBe(0);
    });

    it('should not delete messages from other queues', async () => {
      // Arrange
      const { Queue, Message } = getModels();
      const otherQueue = await Queue.create({ name: 'Other Queue', slug: 'other-queue' });
      
      // Create messages in both queues
      await Message.create([
        { queueId, body: 'Message in test queue' },
        { queueId: otherQueue._id, body: 'Message in other queue' }
      ]);

      // Act
      await messageRepository.deleteByQueueId(queueId);

      // Assert
      const remainingMessages = await Message.find({});
      expect(remainingMessages.length).toBe(1);
      expect(remainingMessages[0].body).toBe('Message in other queue');
    });
  });
}); 