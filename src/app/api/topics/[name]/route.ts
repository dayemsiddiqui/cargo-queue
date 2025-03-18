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
        const topic = await topicService.getTopic(params.name);
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
        await topicService.deleteTopic(params.name);
        return NextResponse.json({ success: true });
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
        const { message } = body;

        if (!message) {
            throw ApiError.badRequest('Message is required');
        }

        await topicService.publishMessage(params.name, message);
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 