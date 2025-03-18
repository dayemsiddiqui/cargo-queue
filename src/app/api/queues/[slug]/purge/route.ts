import { NextRequest, NextResponse } from 'next/server';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// POST /api/queues/[slug]/purge - Purge all messages from a queue
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Queue slug is required' },
        { status: 400 }
      );
    }

    // Purge all messages from the queue
    const result = await queueService.purgeQueue(slug);
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error: any) {
    console.error("API Error purging queue:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 