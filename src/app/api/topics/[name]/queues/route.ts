import { NextResponse } from 'next/server';
import { topicService } from '@/lib/services/TopicService';
import { ApiError } from '@/lib/errors/ApiError';

interface RouteParams {
    params: {
        name: string;
    };
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const queues = await topicService.getTopicTargetQueues(params.name);
        return NextResponse.json(queues);
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const body = await request.json();
        const { queueId } = body;

        if (!queueId) {
            throw ApiError.badRequest('Queue ID is required');
        }

        const topic = await topicService.addTargetQueue(params.name, queueId);
        return NextResponse.json(topic);
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { searchParams } = new URL(request.url);
        const queueId = searchParams.get('queueId');

        if (!queueId) {
            throw ApiError.badRequest('Queue ID is required');
        }

        const topic = await topicService.removeTargetQueue(params.name, queueId);
        return NextResponse.json(topic);
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 