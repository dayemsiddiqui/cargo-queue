import { Queue, Message } from '@/lib/models/Queue';
import { NextRequest, NextResponse } from 'next/server';

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

    // Find the queue
    const queue = await Queue.findOne({ slug });
    if (!queue) {
      return NextResponse.json(
        { error: 'Queue not found' },
        { status: 404 }
      );
    }

    // Create a new message
    const newMessage = await Message.create({
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
    
    // Find the queue
    const queue = await Queue.findOne({ slug });
    if (!queue) {
      return NextResponse.json(
        { error: 'Queue not found' },
        { status: 404 }
      );
    }

    // Simply get the first unprocessed message without using visibilityTimeout
    const message = await Message.findOne({
      queueId: queue._id,
      processed: false
    }).sort({ createdAt: 1 }); // Get the oldest message first

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

    // Mark message as processed
    const message = await Message.findByIdAndUpdate(
      messageId,
      { processed: true },
      { new: true }
    );

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