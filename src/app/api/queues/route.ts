import { Queue } from '@/lib/models/Queue';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to create a slug from a name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/queues - List all queues or get a specific queue by slug
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    
    // If slug is provided, find the specific queue
    if (slug) {
      const queues = await Queue.find({ slug });
      return NextResponse.json({ queues });
    }
    
    // Otherwise, return all queues
    const queues = await Queue.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ queues });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const slug = slugify(name);
    
    // Check if a queue with this name already exists
    const existingQueue = await Queue.findOne({ slug });
    if (existingQueue) {
      return NextResponse.json(
        { error: 'A queue with this name already exists' },
        { status: 400 }
      );
    }

    // Create a new queue
    const queue = await Queue.create({
      name,
      slug,
    });

    return NextResponse.json({ queue }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 