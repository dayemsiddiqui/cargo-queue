import { NextRequest, NextResponse } from 'next/server';
import { queueService } from '@/lib/services/QueueService';
import { ApiError } from '@/lib/errors/ApiError';

// POST /api/queues/[slug]/messages - Send a message to a queue
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Use the updated Next.js 15 approach to access dynamic route params
    const { slug } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use queue service to send message
    const newMessage = await queueService.sendMessage(slug, message);
    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/queues/[slug]/messages - Poll a message from a queue
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Use the updated Next.js 15 approach to access dynamic route params
    const { slug } = await params;
    
    // Use queue service to poll message
    const message = await queueService.pollMessage(slug);

    if (!message) {
      return NextResponse.json({ message: null });
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/queues/[slug]/messages - Delete (acknowledge) a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Use the updated Next.js 15 approach to access dynamic route params
    const { slug } = await params;
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Use queue service to acknowledge message
    await queueService.acknowledgeMessage(messageId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 