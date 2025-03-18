import { NextRequest, NextResponse } from 'next/server';
import { queueRepository } from '@/lib/repositories/QueueRepository';
import { messageRepository } from '@/lib/repositories/MessageRepository';

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

    // Find the queue using repository
    const queue = await queueRepository.findBySlug(slug);
    if (!queue) {
      return NextResponse.json(
        { error: 'Queue not found' },
        { status: 404 }
      );
    }

    // Create a new message using repository
    const newMessage = await messageRepository.create({
      queueId: queue._id,
      body: message,
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    
    // Find the queue using repository
    const queue = await queueRepository.findBySlug(slug);
    if (!queue) {
      return NextResponse.json(
        { error: 'Queue not found' },
        { status: 404 }
      );
    }

    // Get the oldest unprocessed message using repository
    const message = await messageRepository.findOldestUnprocessed(queue._id);

    if (!message) {
      return NextResponse.json({ message: null });
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    // Mark message as processed using repository
    const message = await messageRepository.markAsProcessed(messageId);

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 