import { NextRequest, NextResponse } from 'next/server';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// POST /api/queues/purge-all - Purge and delete all queues
export async function POST(request: NextRequest) {
  try {
    // Call the service to purge and delete all queues
    const result = await queueService.purgeAndDeleteAllQueues();
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("API Error purging all queues:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 