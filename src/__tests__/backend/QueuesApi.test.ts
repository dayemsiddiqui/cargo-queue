import { connect, clearDatabase, closeDatabase, getModels } from '../utils/db-utils';
import { NextRequest, NextResponse } from 'next/server';

// Mock the Queue model
jest.mock('@/lib/models/Queue', () => {
  return {
    Queue: {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn()
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
      // Create test queues
      const { Queue } = getModels();
      const queue1 = await Queue.create({ name: 'Queue 1', slug: 'queue-1' });
      const queue2 = await Queue.create({ name: 'Queue 2', slug: 'queue-2' });
      
      // Mock the imported model's find method
      const mockedQueues = [queue2, queue1];
      require('@/lib/models/Queue').Queue.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockedQueues)
      });
      
      // Mock request
      const req = createMockRequest('http://localhost:3000/api/queues', 'GET');
      
      // Call the handler
      const response = await GET(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.queues).toBeDefined();
      expect(data.queues.length).toBe(2);
    });
    
    it('should return a specific queue by slug', async () => {
      // Create test queues
      const { Queue } = getModels();
      const queue1 = await Queue.create({ name: 'Queue 1', slug: 'queue-1' });
      const queue2 = await Queue.create({ name: 'Queue 2', slug: 'queue-2' });
      
      // Mock the imported model's find method
      require('@/lib/models/Queue').Queue.find.mockResolvedValue([queue1]);
      
      // Mock request
      const req = createMockRequest('http://localhost:3000/api/queues?slug=queue-1', 'GET');
      
      // Call the handler
      const response = await GET(req);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.queues).toBeDefined();
      expect(data.queues.length).toBe(1);
    });
  });
  
  describe('POST /api/queues', () => {
    it('should create a new queue', async () => {
      // Mock the findOne to return null (no existing queue)
      require('@/lib/models/Queue').Queue.findOne.mockResolvedValue(null);
      
      // Mock the create method
      const mockCreatedQueue = {
        _id: '123',
        name: 'New Queue',
        slug: 'new-queue',
        createdAt: new Date()
      };
      require('@/lib/models/Queue').Queue.create.mockResolvedValue(mockCreatedQueue);
      
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
      // Mock findOne to return an existing queue
      const existingQueue = {
        _id: '123',
        name: 'Existing Queue',
        slug: 'existing-queue',
        createdAt: new Date()
      };
      require('@/lib/models/Queue').Queue.findOne.mockResolvedValue(existingQueue);
      
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