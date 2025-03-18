"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Check, RefreshCw, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Queue type
interface Queue {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
  retentionPeriod: number | null;
}

// Message type
interface Message {
  _id: string;
  body: string;
  processed: boolean;
  createdAt: string;
}

// Polling interval in milliseconds
const POLLING_INTERVAL = 5000;

export default function Home() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newQueueName, setNewQueueName] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [retentionPeriod, setRetentionPeriod] = useState<string>("");
  const [updateRetentionDialogOpen, setUpdateRetentionDialogOpen] =
    useState<boolean>(false);
  const [queueToUpdate, setQueueToUpdate] = useState<Queue | null>(null);
  const [updatedRetentionPeriod, setUpdatedRetentionPeriod] =
    useState<string>("");

  // Polling states
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

  // Fetch queues
  const fetchQueues = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/queues");
      const data = await response.json();
      setQueues(data.queues || []);
    } catch (err) {
      console.error("Failed to fetch queues:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new queue
  const createQueue = async () => {
    try {
      const response = await fetch("/api/queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newQueueName,
          retentionPeriod:
            retentionPeriod === "" ? null : Number(retentionPeriod),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create queue");
      }

      setDialogOpen(false);
      setNewQueueName("");
      setRetentionPeriod("");
      fetchQueues();
      toast.success("Queue created successfully!");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to create queue");
      console.error(err);
    }
  };

  // Update queue retention policy
  const updateRetentionPolicy = async () => {
    if (!queueToUpdate) return;

    try {
      // Handle empty string by setting to null (no expiry)
      // And ensure 0 is also treated as null
      const retentionValue =
        updatedRetentionPeriod === ""
          ? null
          : Number(updatedRetentionPeriod) === 0
          ? null
          : Number(updatedRetentionPeriod);

      const response = await fetch(
        `/api/queues/${queueToUpdate.slug}/retention`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            retentionPeriod: retentionValue,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update retention policy");
      }

      // Update the queue in the local state to avoid a full refetch
      setQueues((prevQueues) =>
        prevQueues.map((q) =>
          q._id === queueToUpdate._id
            ? { ...q, retentionPeriod: data.queue.retentionPeriod }
            : q
        )
      );

      setUpdateRetentionDialogOpen(false);
      setQueueToUpdate(null);
      setUpdatedRetentionPeriod("");

      // Force a complete refresh of queues
      await fetchQueues();

      toast.success("Retention policy updated successfully!");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to update retention policy");
      console.error(err);
    }
  };

  // Send a message to the selected queue
  const sendMessage = async () => {
    if (!selectedQueue || !message.trim()) {
      setError("Both queue and message are required");
      return;
    }

    try {
      const queueSlug = queues.find((q) => q._id === selectedQueue)?.slug;

      if (!queueSlug) {
        throw new Error("Selected queue not found");
      }

      const response = await fetch(`/api/queues/${queueSlug}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setMessageDialogOpen(false);
      setMessage("");
      setSelectedQueue("");
      toast.success("Message sent successfully!");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to send message");
      console.error(err);
    }
  };

  // Start polling for messages
  const startPolling = () => {
    if (!pollingQueue) return;

    const queueData = queues.find((q) => q._id === pollingQueue);
    if (!queueData) return;

    // Reset all states to start fresh
    setPollingQueueData(queueData);
    setIsPolling(true);
    setPolledMessage(null);
    setError(null);
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
      const newProgress = Math.min((elapsedTime / POLLING_INTERVAL) * 100, 100);
      setProgress(newProgress);
    }, 50);

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      lastPollTimeRef.current = Date.now();
      setProgress(0); // Reset progress bar
      pollMessage(queueData.slug);
    }, POLLING_INTERVAL);
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

  // Get the queue endpoint URL
  const getQueueUrl = (slug: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/queues/${slug}/messages`;
  };

  // Load queues on component mount
  useEffect(() => {
    fetchQueues();
  }, []);

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
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Cargo Queue</h1>
        <div className="flex gap-2">
          <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={queues.length === 0}>
                Post Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post a message to a queue</DialogTitle>
                <DialogDescription>
                  Select a queue and enter your message to send.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="queue" className="text-right">
                    Queue
                  </label>
                  <div className="col-span-3">
                    <Select
                      onValueChange={setSelectedQueue}
                      value={selectedQueue}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a queue" />
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
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="message" className="text-right">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    className="col-span-3"
                    placeholder="Enter your message"
                    value={message}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMessage(e.target.value)
                    }
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
              <DialogFooter>
                <Button
                  onClick={sendMessage}
                  disabled={!selectedQueue || !message.trim()}
                >
                  Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create Queue</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new queue</DialogTitle>
                <DialogDescription>
                  Enter a name for your new queue and optionally set a retention
                  period. Messages will be automatically deleted after the
                  retention period expires.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right">
                    Queue Name
                  </label>
                  <Input
                    id="name"
                    className="col-span-3"
                    placeholder="Queue name"
                    value={newQueueName}
                    onChange={(e) => setNewQueueName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="retentionPeriod" className="text-right">
                    Retention Period
                  </label>
                  <div className="col-span-3">
                    <Input
                      id="retentionPeriod"
                      type="number"
                      placeholder="In seconds (leave empty for no expiry)"
                      value={retentionPeriod}
                      onChange={(e) => setRetentionPeriod(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Time in seconds before messages are automatically deleted.
                      Leave empty to keep messages indefinitely.
                    </p>
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
              <DialogFooter>
                <Button onClick={createQueue} disabled={!newQueueName.trim()}>
                  Create Queue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={updateRetentionDialogOpen}
            onOpenChange={setUpdateRetentionDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Retention Policy</DialogTitle>
                <DialogDescription>
                  Update how long messages are kept in the "
                  {queueToUpdate?.name}" queue before being automatically
                  deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label
                    htmlFor="updatedRetentionPeriod"
                    className="text-right"
                  >
                    Retention Period
                  </label>
                  <div className="col-span-3">
                    <Input
                      id="updatedRetentionPeriod"
                      type="number"
                      placeholder="In seconds (leave empty for no expiry)"
                      value={updatedRetentionPeriod}
                      onChange={(e) =>
                        setUpdatedRetentionPeriod(e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Time in seconds before messages are automatically deleted.
                      Leave empty to keep messages indefinitely.
                    </p>
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
              <DialogFooter>
                <Button onClick={updateRetentionPolicy}>
                  Update Retention Policy
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading queues...</p>
        </div>
      ) : queues.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-6">
              <h3 className="text-lg font-medium">No queues found</h3>
              <p className="text-muted-foreground mt-2">
                Create your first queue to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Update Retention Policy Dialog */}
          <Dialog
            open={updateRetentionDialogOpen}
            onOpenChange={setUpdateRetentionDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Retention Policy</DialogTitle>
                <DialogDescription>
                  Update how long messages are kept in the "
                  {queueToUpdate?.name}" queue before being automatically
                  deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label
                    htmlFor="updatedRetentionPeriod"
                    className="text-right"
                  >
                    Retention Period
                  </label>
                  <div className="col-span-3">
                    <Input
                      id="updatedRetentionPeriod"
                      type="number"
                      placeholder="In seconds (leave empty for no expiry)"
                      value={updatedRetentionPeriod}
                      onChange={(e) =>
                        setUpdatedRetentionPeriod(e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Time in seconds before messages are automatically deleted.
                      Leave empty to keep messages indefinitely.
                    </p>
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
              <DialogFooter>
                <Button onClick={updateRetentionPolicy}>
                  Update Retention Policy
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Queue Polling Section */}
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
                    <Badge
                      variant="outline"
                      className="ml-2 flex gap-1 items-center"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Polling {pollingQueueData.name} every 5 seconds
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
                            (POLLING_INTERVAL -
                              (progress / 100) * POLLING_INTERVAL) /
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
                          <p className="whitespace-pre-wrap">
                            {polledMessage.body}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>
                              Created:{" "}
                              {new Date(
                                polledMessage.createdAt
                              ).toLocaleString()}
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

          {/* Queues Table */}
          <Card>
            <CardHeader>
              <CardTitle>Your Queues</CardTitle>
              <CardDescription>
                Manage your message queues and their endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Retention Period</TableHead>
                    <TableHead>Endpoint URL</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queues.map((queue) => (
                    <TableRow key={queue._id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/queues/${queue.slug}`}
                          className="hover:underline text-primary"
                        >
                          {queue.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(queue.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {queue.retentionPeriod !== null &&
                        queue.retentionPeriod !== undefined &&
                        queue.retentionPeriod > 0 ? (
                          <>
                            {queue.retentionPeriod < 60
                              ? `${queue.retentionPeriod} seconds`
                              : queue.retentionPeriod < 3600
                              ? `${Math.round(
                                  queue.retentionPeriod / 60
                                )} minutes`
                              : queue.retentionPeriod < 86400
                              ? `${Math.round(
                                  queue.retentionPeriod / 3600
                                )} hours`
                              : `${Math.round(
                                  queue.retentionPeriod / 86400
                                )} days`}
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            No expiry
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="truncate max-w-md">
                        <code className="bg-muted px-1 py-0.5 rounded text-sm">
                          {getQueueUrl(queue.slug)}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/queues/${queue.slug}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                getQueueUrl(queue.slug)
                              );
                              toast.success("Queue URL copied to clipboard");
                            }}
                          >
                            Copy URL
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setQueueToUpdate(queue);
                              setUpdatedRetentionPeriod(
                                queue.retentionPeriod != null &&
                                  queue.retentionPeriod > 0
                                  ? String(queue.retentionPeriod)
                                  : ""
                              );
                              setUpdateRetentionDialogOpen(true);
                            }}
                          >
                            Edit Retention
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Usage</CardTitle>
              <CardDescription>
                How to use the queue service API
              </CardDescription>
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
                  <h3 className="font-bold mb-2">
                    Poll a message from a queue
                  </h3>
                  <code className="block bg-muted p-4 rounded-md text-sm whitespace-pre overflow-x-auto">
                    {`GET /api/queues/{queue-slug}/messages`}
                  </code>
                </div>
                <div>
                  <h3 className="font-bold mb-2">
                    Acknowledge (delete) a message
                  </h3>
                  <code className="block bg-muted p-4 rounded-md text-sm whitespace-pre overflow-x-auto">
                    {`DELETE /api/queues/{queue-slug}/messages?messageId={message-id}`}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
