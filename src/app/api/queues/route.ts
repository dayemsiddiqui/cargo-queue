import { NextRequest, NextResponse } from 'next/server';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// GET /api/queues - List all queues or get a specific queue by slug
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    
    // If slug is provided, find the specific queue
    if (slug) {
      const queue = await queueService.findQueueBySlug(slug);
      return NextResponse.json({ queue });
    }
    
    // Otherwise, return all queues
    const queues = await queueService.findAllQueues();
    return NextResponse.json({ queues });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/queues - Create a new queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create a new queue
    const queue = await queueService.createQueue(name);
    return NextResponse.json({ queue }, { status: 201 });
    
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 