import { connect, clearDatabase, closeDatabase } from '../utils/db-utils';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from '@/lib/errors/ApiError';

// Mock the QueueService
jest.mock('@/lib/services/QueueService', () => {
  return {
    queueService: {
      findAllQueues: jest.fn(),
      findQueueBySlug: jest.fn(),
      createQueue: jest.fn()
    }
  };
});

// Import the API route AFTER mocking dependencies
const { GET, POST } = require('@/app/api/queues/route');

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

describe('Queues API Routes', () => {
  describe('GET /api/queues', () => {
    it('should return all queues', async () => {
      // Create test queues data
      const mockedQueues = [
        { _id: '2', name: 'Queue 2', slug: 'queue-2', createdAt: new Date() },
        { _id: '1', name: 'Queue 1', slug: 'queue-1', createdAt: new Date() }
      ];
      
      // Mock the service method
      require('@/lib/services/QueueService').queueService.findAllQueues.mockResolvedValue(mockedQueues);
      
      // Mock request
      const req = createMockRequest('http://localhost:3000/api/queues', 'GET');
      
      // Call the handler
      const response = await GET(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.queues).toBeDefined();
      expect(data.queues.length).toBe(2);
      expect(require('@/lib/services/QueueService').queueService.findAllQueues).toHaveBeenCalled();
    });
    
    it('should return a specific queue by slug', async () => {
      // Create test queue data
      const queue1 = { _id: '1', name: 'Queue 1', slug: 'queue-1', createdAt: new Date() };
      
      // Mock the service method
      require('@/lib/services/QueueService').queueService.findQueueBySlug.mockResolvedValue(queue1);
      
      // Mock request
      const req = createMockRequest('http://localhost:3000/api/queues?slug=queue-1', 'GET');
      
      // Call the handler
      const response = await GET(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.queue).toBeDefined();
      expect(data.queue.slug).toBe('queue-1');
      expect(require('@/lib/services/QueueService').queueService.findQueueBySlug).toHaveBeenCalledWith('queue-1');
    });
  });
  
  describe('POST /api/queues', () => {
    it('should create a new queue', async () => {
      // Mock the createQueue method
      const mockCreatedQueue = {
        _id: '123',
        name: 'New Queue',
        slug: 'new-queue',
        createdAt: new Date()
      };
      require('@/lib/services/QueueService').queueService.createQueue.mockResolvedValue(mockCreatedQueue);
      
      // Mock request
      const req = createMockRequest(
        'http://localhost:3000/api/queues',
        'POST',
        { name: 'New Queue' }
      );
      
      // Call the handler
      const response = await POST(req);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.queue).toBeDefined();
      expect(data.queue.name).toBe('New Queue');
      expect(data.queue.slug).toBe('new-queue');
      expect(require('@/lib/services/QueueService').queueService.createQueue).toHaveBeenCalledWith('New Queue');
    });
    
    it('should return error if name is missing', async () => {
      // Mock request
      const req = createMockRequest(
        'http://localhost:3000/api/queues',
        'POST',
        {}
      );
      
      // Call the handler
      const response = await POST(req);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });
    
    it('should not allow duplicate queue names', async () => {
      // Mock createQueue to throw a proper ApiError for duplicate
      const error = ApiError.badRequest('A queue with this name already exists');
      require('@/lib/services/QueueService').queueService.createQueue.mockRejectedValue(error);
      
      // Mock request to create the same name
      const req = createMockRequest(
        'http://localhost:3000/api/queues',
        'POST',
        { name: 'Existing Queue' }
      );
      
      // Call the handler
      const response = await POST(req);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('A queue with this name already exists');
    });
  });
}); 