import mongoose from 'mongoose';
import { queueService } from '@/lib/services/QueueService';
import { Message, Queue } from '@/lib/models/Queue';

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Queue Retention Policy Tests', () => {
  beforeAll(async () => {
    // Ensure we're using a test database
    const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/cargo-queue-test';
    await mongoose.connect(dbUrl);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Queue.deleteMany({});
    await Message.deleteMany({});
  });

  test('Queue creation with retention policy', async () => {
    const retentionPeriod = 3600; // 1 hour in seconds
    const queue = await queueService.createQueue('Test Queue', retentionPeriod);
    
    expect(queue).toBeDefined();
    expect(queue.retentionPeriod).toBe(retentionPeriod);
  });

  test('Messages should have expiresAt set based on queue retention policy', async () => {
    // Create queue with 10 second retention
    const retentionPeriod = 10;
    const queue = await queueService.createQueue('Expiring Queue', retentionPeriod);
    
    // Send a message to the queue
    const message = await queueService.sendMessage(queue.slug, 'This message will expire');
    
    // Message should have expiresAt set
    expect(message.expiresAt).toBeDefined();
    
    // expiresAt should be approximately retentionPeriod seconds in the future
    const now = new Date();
    // Check if expiresAt is defined before creating Date
    expect(message.expiresAt).not.toBeNull();
    expect(message.expiresAt).not.toBeUndefined();
    const expiresAt = new Date(message.expiresAt as Date);
    const diffInSeconds = Math.round((expiresAt.getTime() - now.getTime()) / 1000);
    
    // Allow 1 second tolerance for test execution time
    expect(diffInSeconds).toBeGreaterThanOrEqual(retentionPeriod - 1);
    expect(diffInSeconds).toBeLessThanOrEqual(retentionPeriod + 1);
  });

  test('Updating queue retention policy should update existing messages', async () => {
    // Create queue initially without retention
    const queue = await queueService.createQueue('Dynamic Queue');
    
    // Send a message
    const message = await queueService.sendMessage(queue.slug, 'Message with dynamic expiry');
    
    // Initially, message should have no expiry
    expect(message.expiresAt).toBeNull();
    
    // Update queue with 1 hour retention
    const retentionPeriod = 3600;
    await queueService.updateQueueRetentionPolicy(queue.slug, retentionPeriod);
    
    // Check if message was updated with expiry
    const updatedMessage = await Message.findById(message._id);
    expect(updatedMessage?.expiresAt).toBeDefined();
    
    // expiresAt should be approximately retentionPeriod seconds in the future
    const now = new Date();
    // Make sure expiresAt exists before creating a Date
    expect(updatedMessage!.expiresAt).not.toBeNull();
    expect(updatedMessage!.expiresAt).not.toBeUndefined();
    const expiresAt = new Date(updatedMessage!.expiresAt as Date);
    const diffInSeconds = Math.round((expiresAt.getTime() - now.getTime()) / 1000);
    
    // Allow 1 second tolerance for test execution time
    expect(diffInSeconds).toBeGreaterThanOrEqual(retentionPeriod - 1);
    expect(diffInSeconds).toBeLessThanOrEqual(retentionPeriod + 1);
  });

  // This test is slow as it waits for MongoDB TTL to run
  // Only run this test when specifically requested with RUN_SLOW_TESTS=true
  (process.env.RUN_SLOW_TESTS === 'true' ? test : test.skip)('Messages should be automatically deleted after expiry (slow test)', async () => {
    // Create queue with very short retention (3 seconds)
    const retentionPeriod = 3;
    const queue = await queueService.createQueue('Short Expiry Queue', retentionPeriod);
    
    // Send a message to the queue
    const message = await queueService.sendMessage(queue.slug, 'This will expire quickly');
    
    // Verify message exists
    const initialCheck = await Message.findById(message._id);
    expect(initialCheck).toBeDefined();
    
    // Set the expiresAt to 1 second in the past to ensure faster TTL execution
    await Message.findByIdAndUpdate(message._id, {
      expiresAt: new Date(Date.now() - 1000)
    });
    
    // Wait long enough for MongoDB TTL to run (TTL runs approximately every 60s)
    console.log('Waiting for TTL to expire message...');
    await wait(61000);
    
    // Check if message has been deleted
    const afterExpiryCheck = await Message.findById(message._id);
    expect(afterExpiryCheck).toBeNull();
  }, 65000);

  // This test simulates TTL behavior without waiting
  test('Simulation of TTL behavior (faster version)', async () => {
    // Create queue with retention
    const retentionPeriod = 60; // 1 minute
    const queue = await queueService.createQueue('Simulated TTL Queue', retentionPeriod);
    
    // Send a message to the queue
    const message = await queueService.sendMessage(queue.slug, 'Test message');
    
    // Manually simulate MongoDB's TTL index by:
    // 1. Setting the expiresAt to a time in the past
    // 2. Manually running a deletion query similar to what MongoDB would do
    
    // Set expiry to past time
    await Message.findByIdAndUpdate(message._id, {
      expiresAt: new Date(Date.now() - 10000) // 10 seconds in the past
    });
    
    // Manually execute what MongoDB's TTL would do
    await Message.deleteMany({ expiresAt: { $lt: new Date() } });
    
    // Message should be deleted
    const afterSimulatedExpiry = await Message.findById(message._id);
    expect(afterSimulatedExpiry).toBeNull();
  });
}); 