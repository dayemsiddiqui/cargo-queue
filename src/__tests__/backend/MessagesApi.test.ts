import { connect, clearDatabase, closeDatabase, getModels } from '../utils/db-utils';
import { NextRequest } from 'next/server';

// Mock the Queue and Message models
jest.mock('@/lib/models/Queue', () => {
  return {
    Queue: {
      findOne: jest.fn(),
    },
    Message: {
      create: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn()
    }
  };
});

// Import the API route AFTER mocking dependencies
const { GET, POST, DELETE } = require('@/app/api/queues/[slug]/messages/route');

// Setup and teardown
beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeDatabase();
});

// Mock NextRequest
const createMockRequest = (url: string, method: string, body?: any) => {
  const request = {
    url,
    method,
    json: jest.fn().mockResolvedValue(body)
  } as unknown as NextRequest;
  return request;
};

describe('Messages API Routes', () => {
  let queueId: string;
  let queueSlug: string;
  
  beforeEach(async () => {
    // Create a test queue
    const { Queue } = getModels();
    const queue = await Queue.create({ name: 'Test Queue', slug: 'test-queue' });
    queueId = queue._id.toString();
    queueSlug = queue.slug;
    
    // Mock the Queue.findOne to return our test queue
    require('@/lib/models/Queue').Queue.findOne.mockResolvedValue(queue);
  });
  
  describe('POST /api/queues/[slug]/messages', () => {
    it('should create a new message', async () => {
      // Mock the Message.create to return a new message
      const mockMessage = {
        _id: '123',
        body: 'Test message content',
        queueId,
        processed: false,
        createdAt: new Date()
      };
      require('@/lib/models/Queue').Message.create.mockResolvedValue(mockMessage);
      
      // Mock request
      const req = createMockRequest(
        `http://localhost:3000/api/queues/${queueSlug}/messages`,
        'POST',
        { message: 'Test message content' }
      );
      
      // Call the handler
      const response = await POST(req, { params: { slug: queueSlug } });
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.message).toBeDefined();
      expect(data.message.body).toBe('Test message content');
    });
    
    it('should return error if message is missing', async () => {
      // Mock request
      const req = createMockRequest(
        `http://localhost:3000/api/queues/${queueSlug}/messages`,
        'POST',
        {}
      );
      
      // Call the handler
      const response = await POST(req, { params: { slug: queueSlug } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required');
    });
    
    it('should return error if queue does not exist', async () => {
      // Mock Queue.findOne to return null
      require('@/lib/models/Queue').Queue.findOne.mockResolvedValue(null);
      
      // Mock request
      const req = createMockRequest(
        `http://localhost:3000/api/queues/non-existent-queue/messages`,
        'POST',
        { message: 'Test message content' }
      );
      
      // Call the handler
      const response = await POST(req, { params: { slug: 'non-existent-queue' } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Queue not found');
    });
  });
  
  describe('GET /api/queues/[slug]/messages', () => {
    it('should return the oldest unprocessed message', async () => {
      // Create and mock a message
      const mockMessage = {
        _id: '123',
        body: 'Message 1',
        queueId,
        processed: false,
        createdAt: new Date(Date.now() - 2000)
      };
      
      // Mock Message.findOne to return our test message
      require('@/lib/models/Queue').Message.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockMessage)
      });
      
      // Mock request
      const req = createMockRequest(
        `http://localhost:3000/api/queues/${queueSlug}/messages`,
        'GET'
      );
      
      // Call the handler
      const response = await GET(req, { params: { slug: queueSlug } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(data.message.body).toBe('Message 1');
    });
    
    it('should return null if no messages are available', async () => {
      // Mock Message.findOne to return null
      require('@/lib/models/Queue').Message.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null)
      });
      
      // Mock request
      const req = createMockRequest(
        `http://localhost:3000/api/queues/${queueSlug}/messages`,
        'GET'
      );
      
      // Call the handler
      const response = await GET(req, { params: { slug: queueSlug } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.message).toBeNull();
    });
  });
  
  describe('DELETE /api/queues/[slug]/messages', () => {
    it('should mark a message as processed', async () => {
      // Mock a test message
      const mockMessage = {
        _id: 'msg123',
        body: 'Test message',
        queueId,
        processed: true
      };
      
      // Mock Message.findByIdAndUpdate to return the updated message
      require('@/lib/models/Queue').Message.findByIdAndUpdate.mockResolvedValue(mockMessage);
      
      // Mock request
      const req = createMockRequest(
        `http://localhost:3000/api/queues/${queueSlug}/messages?messageId=msg123`,
        'DELETE'
      );
      
      // Call the handler
      const response = await DELETE(req, { params: { slug: queueSlug } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
    
    it('should return error if messageId is missing', async () => {
      // Mock request
      const req = createMockRequest(
        `http://localhost:3000/api/queues/${queueSlug}/messages`,
        'DELETE'
      );
      
      // Call the handler
      const response = await DELETE(req, { params: { slug: queueSlug } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Message ID is required');
    });
    
    it('should return error if message does not exist', async () => {
      // Mock Message.findByIdAndUpdate to return null
      require('@/lib/models/Queue').Message.findByIdAndUpdate.mockResolvedValue(null);
      
      // Mock request
      const req = createMockRequest(
        `http://localhost:3000/api/queues/${queueSlug}/messages?messageId=nonexistent`,
        'DELETE'
      );
      
      // Call the handler
      const response = await DELETE(req, { params: { slug: queueSlug } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Message not found');
    });
  });
}); 