import { NextRequest } from 'next/server';
import { DELETE } from '../route';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// Mock dependencies
jest.mock('@/lib/services/QueueService', () => ({
  queueService: {
    deleteQueue: jest.fn()
  }
}));

describe('Delete Queue API', () => {
  const mockNextRequest = () => {
    return new NextRequest('http://localhost:3000/api/queues/test-queue', {
      method: 'DELETE'
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

  it('should successfully delete a queue', async () => {
    // Mock deleteQueue to return success
    (queueService.deleteQueue as jest.Mock).mockResolvedValue({
      success: true,
      message: `Queue 'test-queue' deleted successfully`
    });

    // Call the handler
    const response = await DELETE(mockNextRequest(), {
      params: { slug: 'test-queue' }
    });
    const data = await response.json();

    // Verify
    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: `Queue 'test-queue' deleted successfully`
    });
    expect(queueService.deleteQueue).toHaveBeenCalledWith('test-queue');
  });

  it('should return 400 if slug is missing', async () => {
    // Call the handler with missing slug
    const response = await DELETE(mockNextRequest(), {
      params: { slug: '' }
    });
    const data = await response.json();

    // Verify
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Queue slug is required' });
    expect(queueService.deleteQueue).not.toHaveBeenCalled();
  });

  it('should return 404 if queue is not found', async () => {
    // Mock deleteQueue to throw not found error
    (queueService.deleteQueue as jest.Mock).mockRejectedValue(
      new ApiError(`Queue with slug 'non-existent' not found`, 404)
    );

    // Call the handler
    const response = await DELETE(mockNextRequest(), {
      params: { slug: 'non-existent' }
    });
    const data = await response.json();

    // Verify
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: `Queue with slug 'non-existent' not found` });
    expect(queueService.deleteQueue).toHaveBeenCalledWith('non-existent');
  });

  it('should return 500 if an internal error occurs', async () => {
    // Mock deleteQueue to throw error
    (queueService.deleteQueue as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Call the handler
    const response = await DELETE(mockNextRequest(), {
      params: { slug: 'test-queue' }
    });
    const data = await response.json();

    // Verify
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
    expect(queueService.deleteQueue).toHaveBeenCalledWith('test-queue');
  });
}); 