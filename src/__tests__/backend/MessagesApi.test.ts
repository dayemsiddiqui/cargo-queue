import { connect, clearDatabase, closeDatabase } from '../utils/db-utils';
import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/errors/ApiError';

// Mock the QueueService
jest.mock('@/lib/services/QueueService', () => {
  return {
    queueService: {
      sendMessage: jest.fn(),
      pollMessage: jest.fn(),
      acknowledgeMessage: jest.fn()
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
  const queueSlug = 'test-queue';
  
  describe('POST /api/queues/[slug]/messages', () => {
    it('should create a new message', async () => {
      // Mock the sendMessage to return a new message
      const mockMessage = {
        _id: '123',
        body: 'Test message content',
        queueId: 'queue123',
        processed: false,
        createdAt: new Date()
      };
      require('@/lib/services/QueueService').queueService.sendMessage.mockResolvedValue(mockMessage);
      
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
      expect(require('@/lib/services/QueueService').queueService.sendMessage)
        .toHaveBeenCalledWith(queueSlug, 'Test message content');
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
      // Mock sendMessage to throw a proper ApiError for not found
      const error = ApiError.notFound('Queue not found');
      require('@/lib/services/QueueService').queueService.sendMessage.mockRejectedValue(error);
      
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
        queueId: 'queue123',
        processed: false,
        createdAt: new Date(Date.now() - 2000)
      };
      
      // Mock pollMessage to return our test message
      require('@/lib/services/QueueService').queueService.pollMessage.mockResolvedValue(mockMessage);
      
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
      expect(require('@/lib/services/QueueService').queueService.pollMessage)
        .toHaveBeenCalledWith(queueSlug);
    });
    
    it('should return null if no messages are available', async () => {
      // Mock pollMessage to return null
      require('@/lib/services/QueueService').queueService.pollMessage.mockResolvedValue(null);
      
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
        queueId: 'queue123',
        processed: true
      };
      
      // Mock acknowledgeMessage to return the updated message
      require('@/lib/services/QueueService').queueService.acknowledgeMessage.mockResolvedValue(mockMessage);
      
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
      expect(require('@/lib/services/QueueService').queueService.acknowledgeMessage)
        .toHaveBeenCalledWith('msg123');
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
      // Mock acknowledgeMessage to throw a proper ApiError for not found
      const error = ApiError.notFound('Message not found');
      require('@/lib/services/QueueService').queueService.acknowledgeMessage.mockRejectedValue(error);
      
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