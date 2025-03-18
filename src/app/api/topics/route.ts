import { NextResponse } from 'next/server';
import { topicService } from '@/lib/services/TopicService';
import { ApiError } from '@/lib/errors/ApiError';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, targetQueueIds } = body;

        if (!name) {
            throw ApiError.badRequest('Topic name is required');
        }

        const topic = await topicService.createTopic({ name, targetQueueIds: targetQueueIds || [] });
        return NextResponse.json(topic);
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const topics = await topicService.listTopics();
        return NextResponse.json(topics);
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 