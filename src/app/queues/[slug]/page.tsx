"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Queue and Message types
interface Queue {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
}

interface Message {
  _id: string;
  body: string;
  processed: boolean;
  createdAt: string;
}

export default function QueueDetails() {
  const params = useParams();
  const slug = params.slug as string;

  const [queue, setQueue] = useState<Queue | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [receivedMessage, setReceivedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch queue details
  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/queues?slug=${slug}`);
      const data = await response.json();

      if (data.queues && data.queues.length > 0) {
        setQueue(data.queues[0]);
      } else {
        setError("Queue not found");
      }
    } catch (err) {
      setError("Failed to fetch queue details");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Send a message to the queue
  const sendMessage = async () => {
    try {
      const response = await fetch(`/api/queues/${slug}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: newMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setNewMessage("");
      alert("Message sent successfully!");
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    }
  };

  // Poll a message from the queue
  const pollMessage = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/queues/${slug}/messages`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to poll message");
      }

      setReceivedMessage(data.message);

      if (!data.message) {
        alert("No messages available in the queue");
      }
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    }
  };

  // Acknowledge (delete) a message
  const acknowledgeMessage = async (messageId: string) => {
    try {
      setError(null);
      const response = await fetch(
        `/api/queues/${slug}/messages?messageId=${messageId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to acknowledge message");
      }

      setReceivedMessage(null);
      alert("Message acknowledged successfully!");
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    }
  };

  // Load queue on component mount
  useEffect(() => {
    fetchQueue();
  }, [slug]);

  // Get API URL for the queue
  const getQueueUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/queues/${slug}/messages`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <p>Loading queue details...</p>
        </div>
      </div>
    );
  }

  if (error || !queue) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <p className="text-red-500">{error || "Queue not found"}</p>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{queue.name}</h1>
          <p className="text-muted-foreground">
            Created on {new Date(queue.createdAt).toLocaleString()}
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>Add a new message to the queue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Message
                </label>
                <Input
                  id="message"
                  placeholder="Enter message content"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="w-full"
              >
                Send Message
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poll a Message</CardTitle>
            <CardDescription>
              Retrieve the next available message from the queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={pollMessage} className="w-full">
                Poll for Message
              </Button>

              {receivedMessage && (
                <div className="border rounded-md p-4 mt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Message ID:</label>
                    <p className="text-sm font-mono">{receivedMessage._id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Content:</label>
                    <p className="text-sm">{receivedMessage.body}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Received at:</label>
                    <p className="text-sm">{new Date().toLocaleString()}</p>
                  </div>
                  <Button
                    onClick={() => acknowledgeMessage(receivedMessage._id)}
                    variant="destructive"
                    size="sm"
                  >
                    Acknowledge (Delete)
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Queue Details</CardTitle>
          <CardDescription>
            API endpoint information for this queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Queue URL:</label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="bg-muted px-2 py-1 rounded text-sm flex-1 overflow-x-auto">
                  {getQueueUrl()}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(getQueueUrl());
                    alert("Queue URL copied to clipboard");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold">API Usage:</h3>
              <div>
                <h4 className="text-sm font-semibold">POST - Send a message</h4>
                <code className="block bg-muted p-2 rounded-md text-xs whitespace-pre overflow-x-auto mt-1">
                  {`curl -X POST "${getQueueUrl()}" -H "Content-Type: application/json" -d '{"message":"Hello world"}'`}
                </code>
              </div>
              <div>
                <h4 className="text-sm font-semibold">GET - Poll a message</h4>
                <code className="block bg-muted p-2 rounded-md text-xs whitespace-pre overflow-x-auto mt-1">
                  {`curl -X GET "${getQueueUrl()}"`}
                </code>
              </div>
              <div>
                <h4 className="text-sm font-semibold">
                  DELETE - Acknowledge a message
                </h4>
                <code className="block bg-muted p-2 rounded-md text-xs whitespace-pre overflow-x-auto mt-1">
                  {`curl -X DELETE "${getQueueUrl()}?messageId=MESSAGE_ID"`}
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
