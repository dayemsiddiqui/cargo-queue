"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ApiUsageGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Usage</CardTitle>
        <CardDescription>How to use the queue service API</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-bold mb-2">Send a message to a queue</h3>
            <code className="block bg-muted p-4 rounded-md text-sm whitespace-pre overflow-x-auto">
              {`POST /api/queues/{queue-slug}/messages
Content-Type: application/json

{
  "message": "Your message content"
}`}
            </code>
          </div>
          <div>
            <h3 className="font-bold mb-2">Poll a message from a queue</h3>
            <code className="block bg-muted p-4 rounded-md text-sm whitespace-pre overflow-x-auto">
              {`GET /api/queues/{queue-slug}/messages`}
            </code>
          </div>
          <div>
            <h3 className="font-bold mb-2">Acknowledge (delete) a message</h3>
            <code className="block bg-muted p-4 rounded-md text-sm whitespace-pre overflow-x-auto">
              {`DELETE /api/queues/{queue-slug}/messages?messageId={message-id}`}
            </code>
          </div>
          <div>
            <h3 className="font-bold mb-2">Purge all messages from a queue</h3>
            <code className="block bg-muted p-4 rounded-md text-sm whitespace-pre overflow-x-auto">
              {`POST /api/queues/{queue-slug}/purge`}
            </code>
          </div>
          <div>
            <h3 className="font-bold mb-2">Delete a queue</h3>
            <code className="block bg-muted p-4 rounded-md text-sm whitespace-pre overflow-x-auto">
              {`DELETE /api/queues/{queue-slug}`}
            </code>
          </div>
          <div>
            <h3 className="font-bold mb-2">Purge & Delete a queue</h3>
            <code className="block bg-muted p-4 rounded-md text-sm whitespace-pre overflow-x-auto">
              {`# Step 1: Purge all messages
POST /api/queues/{queue-slug}/purge

# Step 2: Delete the queue
DELETE /api/queues/{queue-slug}`}
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
