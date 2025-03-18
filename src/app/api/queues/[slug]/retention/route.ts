import { NextRequest, NextResponse } from 'next/server';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// PATCH /api/queues/[slug]/retention - Update queue retention policy
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { retentionPeriod } = body;

    if (slug === undefined) {
      return NextResponse.json(
        { error: 'Queue slug is required' },
        { status: 400 }
      );
    }

    // Normalize the retentionPeriod value to handle edge cases
    // If retentionPeriod is 0, treat it as null (no expiry)
    const normalizedRetentionPeriod = retentionPeriod === 0 ? null : retentionPeriod;

    // Update the queue's retention policy
    const queue = await queueService.updateQueueRetentionPolicy(slug, normalizedRetentionPeriod);
    
    return NextResponse.json({ queue });
    
  } catch (error: any) {
    console.error("API Error updating retention:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 