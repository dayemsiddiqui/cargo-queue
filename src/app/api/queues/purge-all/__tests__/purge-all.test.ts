import { NextRequest } from 'next/server';
import { POST } from '../route';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// Mock dependencies
jest.mock('@/lib/services/QueueService', () => ({
  queueService: {
    purgeAndDeleteAllQueues: jest.fn()
  }
}));

describe('Purge All Queues API', () => {
  const mockNextRequest = () => {
    return new NextRequest('http://localhost:3000/api/queues/purge-all', {
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

  it('should successfully purge and delete all queues', async () => {
    // Mock purgeAndDeleteAllQueues to return success
    (queueService.purgeAndDeleteAllQueues as jest.Mock).mockResolvedValue({
      success: true,
      message: 'All queues and messages have been purged and deleted'
    });

    // Call the handler
    const response = await POST(mockNextRequest());
    const data = await response.json();

    // Verify
    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'All queues and messages have been purged and deleted'
    });
    expect(queueService.purgeAndDeleteAllQueues).toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    // Mock purgeAndDeleteAllQueues to throw an API error
    (queueService.purgeAndDeleteAllQueues as jest.Mock).mockRejectedValue(
      new ApiError('Internal server error', 500)
    );

    // Call the handler
    const response = await POST(mockNextRequest());
    const data = await response.json();

    // Verify
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should handle unexpected errors', async () => {
    // Mock purgeAndDeleteAllQueues to throw an unexpected error
    (queueService.purgeAndDeleteAllQueues as jest.Mock).mockRejectedValue(
      new Error('Unexpected error')
    );

    // Call the handler
    const response = await POST(mockNextRequest());
    const data = await response.json();

    // Verify
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });
}); 