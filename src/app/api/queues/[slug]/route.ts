import { NextRequest, NextResponse } from 'next/server';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// GET /api/queues/[slug] - Get a specific queue by slug
export async function GET(
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

    const queue = await queueService.findQueueBySlug(slug);
    return NextResponse.json({ queue });
    
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/queues/[slug] - Delete a queue
export async function DELETE(
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

    // Use queue service to delete the queue
    const result = await queueService.deleteQueue(slug);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("API Error deleting queue:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 