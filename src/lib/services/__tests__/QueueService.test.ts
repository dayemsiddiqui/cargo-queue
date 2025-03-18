import { QueueService } from '../QueueService';
import { queueRepository } from '@/lib/repositories/QueueRepository';
import { messageRepository } from '@/lib/repositories/MessageRepository';
import { ApiError } from '@/lib/errors/ApiError';
import mongoose from 'mongoose';
import { Queue, Message } from '@/lib/models/Queue';
import { queueService } from '../QueueService';

// Mocking dependencies
jest.mock('@/lib/repositories/QueueRepository');
jest.mock('@/lib/repositories/MessageRepository');

// Mock out the mongoose models
jest.mock('@/lib/models/Queue', () => ({
  Queue: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn()
  },
  Message: {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn()
  }
}));

describe('QueueService', () => {
  let queueService: QueueService;
  
  beforeEach(() => {
    jest.resetAllMocks();
    queueService = new QueueService();
  });
  
  describe('purgeQueue', () => {
    it('should purge all messages in a queue', async () => {
      // Mock data
      const mockQueueId = new mongoose.Types.ObjectId();
      const mockQueue = {
        _id: mockQueueId,
        name: 'Test Queue',
        slug: 'test-queue',
        createdAt: new Date(),
        retentionPeriod: null
      };
      
      const deleteResult = { deletedCount: 10 };
      
      // Setup mocks
      (queueRepository.findBySlug as jest.Mock).mockResolvedValue(mockQueue);
      (messageRepository.deleteByQueueId as jest.Mock).mockResolvedValue(deleteResult);
      
      // Execute
      const result = await queueService.purgeQueue('test-queue');
      
      // Verify
      expect(queueRepository.findBySlug).toHaveBeenCalledWith('test-queue');
      expect(messageRepository.deleteByQueueId).toHaveBeenCalledWith(mockQueueId);
      expect(result).toEqual({
        purged: true,
        count: 10
      });
    });
    
    it('should throw error if queue not found', async () => {
      // Setup mocks
      (queueRepository.findBySlug as jest.Mock).mockResolvedValue(null);
      
      // Execute & Verify
      await expect(queueService.purgeQueue('non-existent')).rejects.toThrow(ApiError);
      expect(queueRepository.findBySlug).toHaveBeenCalledWith('non-existent');
      expect(messageRepository.deleteByQueueId).not.toHaveBeenCalled();
    });
    
    it('should return 0 count if no messages to purge', async () => {
      // Mock data
      const mockQueueId = new mongoose.Types.ObjectId();
      const mockQueue = {
        _id: mockQueueId,
        name: 'Empty Queue',
        slug: 'empty-queue',
        createdAt: new Date(),
        retentionPeriod: null
      };
      
      const deleteResult = { deletedCount: 0 };
      
      // Setup mocks
      (queueRepository.findBySlug as jest.Mock).mockResolvedValue(mockQueue);
      (messageRepository.deleteByQueueId as jest.Mock).mockResolvedValue(deleteResult);
      
      // Execute
      const result = await queueService.purgeQueue('empty-queue');
      
      // Verify
      expect(result).toEqual({
        purged: true,
        count: 0
      });
    });
  });
  
  describe('deleteQueue', () => {
    it('should delete a queue', async () => {
      // Mock data
      const mockQueueId = new mongoose.Types.ObjectId();
      const mockQueue = {
        _id: mockQueueId,
        name: 'Test Queue',
        slug: 'test-queue',
        createdAt: new Date(),
        retentionPeriod: null
      };
      
      // Setup mocks
      (queueRepository.findBySlug as jest.Mock).mockResolvedValue(mockQueue);
      (queueRepository.delete as jest.Mock).mockResolvedValue({ acknowledged: true });
      
      // Execute
      const result = await queueService.deleteQueue('test-queue');
      
      // Verify
      expect(queueRepository.findBySlug).toHaveBeenCalledWith('test-queue');
      expect(queueRepository.delete).toHaveBeenCalledWith(mockQueueId.toString());
      expect(result).toEqual({
        success: true,
        message: `Queue 'test-queue' deleted successfully`
      });
    });
    
    it('should throw error if queue not found', async () => {
      // Setup mocks
      (queueRepository.findBySlug as jest.Mock).mockResolvedValue(null);
      
      // Execute & Verify
      await expect(queueService.deleteQueue('non-existent')).rejects.toThrow(ApiError);
      expect(queueRepository.findBySlug).toHaveBeenCalledWith('non-existent');
      expect(queueRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('purgeAndDeleteAllQueues', () => {
    it('should delete all messages and queues', async () => {
      // Mock Message.deleteMany to return a successful deletion
      (Message.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 10 });
      
      // Mock Queue.deleteMany to return a successful deletion
      (Queue.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 });
      
      // Call the service method
      const result = await queueService.purgeAndDeleteAllQueues();
      
      // Verify the result
      expect(result).toEqual({
        success: true,
        message: 'All queues and messages have been purged and deleted'
      });
      
      // Verify the correct methods were called
      expect(Message.deleteMany).toHaveBeenCalledWith({});
      expect(Queue.deleteMany).toHaveBeenCalledWith({});
    });
  });
}); 