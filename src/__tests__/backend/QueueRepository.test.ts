import { connect, clearDatabase, closeDatabase, getModels } from '../utils/db-utils';
import { queueRepository } from '@/lib/repositories/QueueRepository';
import mongoose from 'mongoose';

describe('QueueRepository', () => {
  // Setup and teardown
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('create', () => {
    it('should create a new queue', async () => {
      // Act
      const queue = await queueRepository.create({
        name: 'Test Queue',
        slug: 'test-queue'
      });

      // Assert
      expect(queue).toBeDefined();
      expect(queue.name).toBe('Test Queue');
      expect(queue.slug).toBe('test-queue');
    });

    it('should throw an error when creating a queue with a duplicate name', async () => {
      // Arrange
      await queueRepository.create({
        name: 'Test Queue',
        slug: 'test-queue-1'
      });

      // Act & Assert
      await expect(queueRepository.create({
        name: 'Test Queue',
        slug: 'test-queue-2'
      })).rejects.toThrow();
    });

    it('should throw an error when creating a queue with a duplicate slug', async () => {
      // Arrange
      await queueRepository.create({
        name: 'Test Queue 1',
        slug: 'test-queue'
      });

      // Act & Assert
      await expect(queueRepository.create({
        name: 'Test Queue 2',
        slug: 'test-queue'
      })).rejects.toThrow();
    });
  });

  describe('findBySlug', () => {
    it('should find a queue by slug', async () => {
      // Arrange
      const { Queue } = getModels();
      await Queue.create({
        name: 'Test Queue',
        slug: 'test-queue'
      });

      // Act
      const queue = await queueRepository.findBySlug('test-queue');

      // Assert
      expect(queue).toBeDefined();
      expect(queue!.name).toBe('Test Queue');
    });

    it('should return null if no queue with the slug exists', async () => {
      // Act
      const queue = await queueRepository.findBySlug('non-existent-slug');

      // Assert
      expect(queue).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all queues', async () => {
      // Arrange
      const { Queue } = getModels();
      await Queue.create([
        { name: 'Queue 1', slug: 'queue-1' },
        { name: 'Queue 2', slug: 'queue-2' },
        { name: 'Queue 3', slug: 'queue-3' }
      ]);

      // Act
      const queues = await queueRepository.findAll();

      // Assert
      expect(queues).toHaveLength(3);
      expect(queues.map(q => q.name)).toContain('Queue 1');
      expect(queues.map(q => q.name)).toContain('Queue 2');
      expect(queues.map(q => q.name)).toContain('Queue 3');
    });

    it('should return an empty array if no queues exist', async () => {
      // Act
      const queues = await queueRepository.findAll();

      // Assert
      expect(queues).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should find a queue by id', async () => {
      // Arrange
      const { Queue } = getModels();
      const queue = await Queue.create({
        name: 'Test Queue',
        slug: 'test-queue'
      });

      // Act
      const foundQueue = await queueRepository.findById(queue._id.toString());

      // Assert
      expect(foundQueue).toBeDefined();
      expect(foundQueue!.name).toBe('Test Queue');
    });

    it('should return null if no queue with the id exists', async () => {
      // Act
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const queue = await queueRepository.findById(nonExistentId);

      // Assert
      expect(queue).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a queue', async () => {
      // Arrange
      const { Queue } = getModels();
      const queue = await Queue.create({
        name: 'Original Name',
        slug: 'original-slug'
      });

      // Act
      const updatedQueue = await queueRepository.update(queue._id.toString(), {
        name: 'Updated Name'
      });

      // Assert
      expect(updatedQueue).toBeDefined();
      expect(updatedQueue!.name).toBe('Updated Name');
      expect(updatedQueue!.slug).toBe('original-slug'); // Should be unchanged
    });

    it('should return null if no queue with the id exists', async () => {
      // Act
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await queueRepository.update(nonExistentId, {
        name: 'Updated Name'
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should throw an error when updating to an existing name', async () => {
      // Arrange
      const { Queue } = getModels();
      await Queue.create({
        name: 'Existing Queue',
        slug: 'existing-queue'
      });
      
      const queueToUpdate = await Queue.create({
        name: 'Queue To Update',
        slug: 'queue-to-update'
      });

      // Act & Assert
      await expect(queueRepository.update(queueToUpdate._id.toString(), {
        name: 'Existing Queue'
      })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a queue', async () => {
      // Arrange
      const { Queue } = getModels();
      const queue = await Queue.create({
        name: 'Queue To Delete',
        slug: 'queue-to-delete'
      });

      // Act
      const deletedQueue = await queueRepository.delete(queue._id.toString());

      // Assert
      expect(deletedQueue).toBeDefined();
      expect(deletedQueue!.name).toBe('Queue To Delete');
      
      // Verify queue is deleted
      const foundQueue = await Queue.findById(queue._id);
      expect(foundQueue).toBeNull();
    });

    it('should return null if no queue with the id exists', async () => {
      // Act
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await queueRepository.delete(nonExistentId);

      // Assert
      expect(result).toBeNull();
    });
  });
}); 