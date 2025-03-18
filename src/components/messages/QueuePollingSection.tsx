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
import { Check, RefreshCw, X } from "lucide-react";
import { Queue, Message } from "@/types/queue";
import { toast } from "sonner";
import { MultiSelect, OptionType } from "@/components/ui/multi-select";

interface QueuePollingProps {
  queues: Queue[];
  pollingInterval: number;
}

interface PollingQueueState {
  queue: Queue;
  polledMessage: Message | null;
  isAcknowledging: boolean;
  progress: number;
  lastPollTime: number;
}

export default function QueuePollingSection({
  queues,
  pollingInterval,
}: QueuePollingProps) {
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingQueues, setPollingQueues] = useState<
    Record<string, PollingQueueState>
  >({});
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convert queues to options format for MultiSelect
  const queueOptions: OptionType[] = queues.map((queue) => ({
    value: queue._id,
    label: queue.name,
  }));

  // Start polling for messages
  const startPolling = () => {
    if (selectedQueues.length === 0) return;

    // Initialize polling state for each selected queue
    const initialPollingState: Record<string, PollingQueueState> = {};

    selectedQueues.forEach((queueId) => {
      const queueData = queues.find((q) => q._id === queueId);
      if (queueData) {
        initialPollingState[queueId] = {
          queue: queueData,
          polledMessage: null,
          isAcknowledging: false,
          progress: 0,
          lastPollTime: Date.now(),
        };
      }
    });

    setPollingQueues(initialPollingState);
    setIsPolling(true);

    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Poll immediately for all selected queues
    Object.values(initialPollingState).forEach((queueState) => {
      pollMessage(queueState.queue.slug, queueState.queue._id);
    });

    // Set up progress bar interval (update every 50ms for smooth animation)
    progressIntervalRef.current = setInterval(() => {
      setPollingQueues((prev) => {
        const updated = { ...prev };

        Object.keys(updated).forEach((queueId) => {
          const queueState = updated[queueId];
          const elapsedTime = Date.now() - queueState.lastPollTime;
          const newProgress = Math.min(
            (elapsedTime / pollingInterval) * 100,
            100
          );
          updated[queueId] = { ...queueState, progress: newProgress };
        });

        return updated;
      });
    }, 50);

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      setPollingQueues((prev) => {
        const updated = { ...prev };

        Object.keys(updated).forEach((queueId) => {
          const queueState = updated[queueId];
          updated[queueId] = {
            ...queueState,
            lastPollTime: Date.now(),
            progress: 0,
          };

          pollMessage(queueState.queue.slug, queueId);
        });

        return updated;
      });
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
    setPollingQueues({});
  };

  // Remove a single queue from polling
  const removeQueueFromPolling = (queueId: string) => {
    setPollingQueues((prev) => {
      const updated = { ...prev };
      delete updated[queueId];

      // If no more queues are being polled, stop polling completely
      if (Object.keys(updated).length === 0) {
        stopPolling();
      }

      return updated;
    });
  };

  // Poll a message from the queue
  const pollMessage = async (slug: string, queueId: string) => {
    try {
      const response = await fetch(`/api/queues/${slug}/messages`);

      if (!response.ok) {
        throw new Error("Failed to poll message");
      }

      const data = await response.json();

      // Update the polled message for this queue
      setPollingQueues((prev) => ({
        ...prev,
        [queueId]: {
          ...prev[queueId],
          polledMessage: data.message,
        },
      }));
    } catch (err) {
      console.error("Failed to poll message:", err);
      toast.error(`Failed to poll message from queue: ${slug}`);
    }
  };

  // Acknowledge the message
  const acknowledgeMessage = async (queueId: string) => {
    const queueState = pollingQueues[queueId];
    if (!queueState || !queueState.polledMessage) return;

    try {
      setPollingQueues((prev) => ({
        ...prev,
        [queueId]: {
          ...prev[queueId],
          isAcknowledging: true,
        },
      }));

      const response = await fetch(
        `/api/queues/${queueState.queue.slug}/messages?messageId=${queueState.polledMessage._id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to acknowledge message");
      }

      toast.success(
        `Message acknowledged successfully from ${queueState.queue.name}!`
      );

      // Update state with acknowledged message and reset timer
      setPollingQueues((prev) => ({
        ...prev,
        [queueId]: {
          ...prev[queueId],
          polledMessage: null,
          isAcknowledging: false,
          lastPollTime: Date.now(),
          progress: 0,
        },
      }));

      // Poll for a new message right away
      pollMessage(queueState.queue.slug, queueId);
    } catch (err) {
      console.error("Failed to acknowledge message:", err);
      toast.error(
        `Failed to acknowledge message from ${queueState.queue.name}`
      );

      setPollingQueues((prev) => ({
        ...prev,
        [queueId]: {
          ...prev[queueId],
          isAcknowledging: false,
        },
      }));
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
        <CardTitle>Poll Messages from Queues</CardTitle>
        <CardDescription>
          Select one or more queues to continuously poll for new messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {!isPolling ? (
            <>
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">
                  Select Queues to Poll
                </h3>
                <MultiSelect
                  options={queueOptions}
                  selected={selectedQueues}
                  onChange={setSelectedQueues}
                  placeholder="Select queues to poll..."
                  emptyText="No queues available."
                  className="mb-2"
                />
              </div>
              <Button
                onClick={startPolling}
                disabled={selectedQueues.length === 0}
                className="w-full md:w-auto"
              >
                Start Polling{" "}
                {selectedQueues.length > 0 &&
                  `(${selectedQueues.length} queues)`}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="flex gap-1 items-center">
                  <RefreshCw className="h-3 w-3" />
                  Polling {Object.keys(pollingQueues).length} queues every{" "}
                  {pollingInterval / 1000} seconds
                </Badge>
                <Button variant="destructive" onClick={stopPolling} size="sm">
                  Stop All Polling
                </Button>
              </div>

              <div className="space-y-4 mt-2">
                {Object.entries(pollingQueues).map(([queueId, queueState]) => (
                  <div key={queueId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium">
                        {queueState.queue.name}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQueueFromPolling(queueId)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Progress bar showing time until next poll */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Next poll in:</span>
                        <span>
                          {Math.ceil(
                            (pollingInterval -
                              (queueState.progress / 100) * pollingInterval) /
                              1000
                          )}{" "}
                          seconds
                        </span>
                      </div>
                      <Progress
                        value={queueState.progress}
                        className="h-1 bg-muted"
                      />
                    </div>

                    {/* Message polling results */}
                    <h4 className="text-sm font-medium mb-2">
                      Message Polling Results
                    </h4>
                    {queueState.polledMessage ? (
                      <div className="space-y-4">
                        <div className="bg-muted p-3 rounded-md">
                          <p className="font-medium mb-1">Message:</p>
                          <p className="whitespace-pre-wrap">
                            {queueState.polledMessage.body}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>
                              Created:{" "}
                              {new Date(
                                queueState.polledMessage.createdAt
                              ).toLocaleString()}
                            </span>
                            <span>ID: {queueState.polledMessage._id}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => acknowledgeMessage(queueId)}
                          variant="outline"
                          disabled={queueState.isAcknowledging}
                          className="w-full"
                        >
                          {queueState.isAcknowledging ? (
                            "Acknowledging..."
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" /> Acknowledge
                              Message
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-muted p-3 rounded-md text-center text-muted-foreground">
                        No message received yet. Waiting for messages...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
