"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Check, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Queue, Message } from "@/types/queue";
import { toast } from "sonner";

interface QueuePollingProps {
  queues: Queue[];
  pollingInterval: number;
}

export default function QueuePollingSection({
  queues,
  pollingInterval,
}: QueuePollingProps) {
  const [pollingQueue, setPollingQueue] = useState<string>("");
  const [pollingQueueData, setPollingQueueData] = useState<Queue | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [polledMessage, setPolledMessage] = useState<Message | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Progress bar states
  const [progress, setProgress] = useState<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<number>(0);

  // Start polling for messages
  const startPolling = () => {
    if (!pollingQueue) return;

    const queueData = queues.find((q) => q._id === pollingQueue);
    if (!queueData) return;

    // Reset all states to start fresh
    setPollingQueueData(queueData);
    setIsPolling(true);
    setPolledMessage(null);
    setProgress(0);

    // Record polling start time
    lastPollTimeRef.current = Date.now();

    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Poll immediately
    pollMessage(queueData.slug);

    // Set up progress bar interval (update every 50ms for smooth animation)
    progressIntervalRef.current = setInterval(() => {
      const elapsedTime = Date.now() - lastPollTimeRef.current;
      const newProgress = Math.min((elapsedTime / pollingInterval) * 100, 100);
      setProgress(newProgress);
    }, 50);

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      lastPollTimeRef.current = Date.now();
      setProgress(0); // Reset progress bar
      pollMessage(queueData.slug);
    }, pollingInterval);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsPolling(false);
    setPolledMessage(null);
    setPollingQueueData(null);
    setProgress(0);
  };

  // Poll a message from the queue
  const pollMessage = async (slug: string) => {
    try {
      const response = await fetch(`/api/queues/${slug}/messages`);

      if (!response.ok) {
        throw new Error("Failed to poll message");
      }

      const data = await response.json();

      // Simply update the UI with whatever the API returns
      setPolledMessage(data.message);
    } catch (err) {
      console.error("Failed to poll message:", err);
      toast.error("Failed to poll message");
    }
  };

  // Acknowledge the message
  const acknowledgeMessage = async () => {
    if (!polledMessage || !pollingQueueData) return;

    try {
      setIsAcknowledging(true);
      const response = await fetch(
        `/api/queues/${pollingQueueData.slug}/messages?messageId=${polledMessage._id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to acknowledge message");
      }

      toast.success("Message acknowledged successfully!");
      setPolledMessage(null);

      // Poll for a new message right away
      lastPollTimeRef.current = Date.now();
      setProgress(0);
      pollMessage(pollingQueueData.slug);
    } catch (err) {
      console.error("Failed to acknowledge message:", err);
      toast.error("Failed to acknowledge message");
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Poll Messages from Queue</CardTitle>
        <CardDescription>
          Select a queue to continuously poll for new messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Select
                onValueChange={setPollingQueue}
                value={pollingQueue}
                disabled={isPolling}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a queue to poll" />
                </SelectTrigger>
                <SelectContent>
                  {queues.map((queue) => (
                    <SelectItem key={queue._id} value={queue._id}>
                      {queue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isPolling ? (
              <Button onClick={startPolling} disabled={!pollingQueue}>
                Start Polling
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopPolling}>
                Stop Polling
              </Button>
            )}
            {isPolling && pollingQueueData && (
              <Badge variant="outline" className="ml-2 flex gap-1 items-center">
                <RefreshCw className="h-3 w-3" />
                Polling {pollingQueueData.name} every {pollingInterval / 1000}{" "}
                seconds
              </Badge>
            )}
          </div>

          {isPolling && (
            <div className="border rounded-lg p-4 mt-4">
              {/* Progress bar showing time until next poll */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Next poll in:</span>
                  <span>
                    {Math.ceil(
                      (pollingInterval - (progress / 100) * pollingInterval) /
                        1000
                    )}{" "}
                    seconds
                  </span>
                </div>
                <Progress value={progress} className="h-1 bg-muted" />
              </div>

              <h3 className="text-lg font-medium mb-2">
                Message Polling Results
              </h3>
              {polledMessage ? (
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-medium mb-1">Message:</p>
                    <p className="whitespace-pre-wrap">{polledMessage.body}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>
                        Created:{" "}
                        {new Date(polledMessage.createdAt).toLocaleString()}
                      </span>
                      <span>ID: {polledMessage._id}</span>
                    </div>
                  </div>
                  <Button
                    onClick={acknowledgeMessage}
                    variant="outline"
                    disabled={isAcknowledging}
                    className="flex gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Acknowledge Message
                  </Button>
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground">
                  <p>No messages available in queue</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
