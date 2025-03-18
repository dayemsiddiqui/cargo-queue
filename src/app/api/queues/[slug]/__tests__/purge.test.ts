import { NextRequest } from 'next/server';
import { POST } from '../purge/route';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// Mock dependencies
jest.mock('@/lib/services/QueueService', () => ({
  queueService: {
    purgeQueue: jest.fn()
  }
}));

describe('Purge Queue API', () => {
  const mockNextRequest = () => {
    return new NextRequest('http://localhost:3000/api/queues/test-queue/purge', {
      method: 'POST'
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    // Mock console.error to prevent logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    jest.restoreAllMocks();
  });

  it('should successfully purge messages from a queue', async () => {
    // Mock purgeQueue to return successful result
    (queueService.purgeQueue as jest.Mock).mockResolvedValue({
      purged: true,
      count: 10
    });

    // Call the handler
    const response = await POST(mockNextRequest(), {
      params: { slug: 'test-queue' }
    });
    const data = await response.json();

    // Verify
    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      purged: true,
      count: 10
    });
    expect(queueService.purgeQueue).toHaveBeenCalledWith('test-queue');
  });

  it('should return 400 if slug is missing', async () => {
    // Call the handler with missing slug
    const response = await POST(mockNextRequest(), {
      params: { slug: '' }
    });
    const data = await response.json();

    // Verify
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Queue slug is required' });
    expect(queueService.purgeQueue).not.toHaveBeenCalled();
  });

  it('should return 404 if queue is not found', async () => {
    // Mock purgeQueue to throw not found error
    (queueService.purgeQueue as jest.Mock).mockRejectedValue(
      new ApiError('Queue not found', 404)
    );

    // Call the handler
    const response = await POST(mockNextRequest(), {
      params: { slug: 'non-existent' }
    });
    const data = await response.json();

    // Verify
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Queue not found' });
    expect(queueService.purgeQueue).toHaveBeenCalledWith('non-existent');
  });

  it('should return 500 if an internal error occurs', async () => {
    // Mock purgeQueue to throw generic error
    (queueService.purgeQueue as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Call the handler
    const response = await POST(mockNextRequest(), {
      params: { slug: 'test-queue' }
    });
    const data = await response.json();

    // Verify
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
    expect(queueService.purgeQueue).toHaveBeenCalledWith('test-queue');
  });
}); 