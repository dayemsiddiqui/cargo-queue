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
import { Plus, Send, Trash2 } from "lucide-react";
import CreateQueueDialog from "@/components/queues/CreateQueueDialog";
import UpdateRetentionDialog from "@/components/queues/UpdateRetentionDialog";
import DeleteQueueDialog from "@/components/queues/DeleteQueueDialog";
import PurgeAllQueuesDialog from "@/components/queues/PurgeAllQueuesDialog";
import PostMessageDialog from "@/components/messages/PostMessageDialog";
import QueuePollingSection from "@/components/messages/QueuePollingSection";
import QueueTable from "@/components/queues/QueueTable";
import ApiUsageGuide from "@/components/ApiUsageGuide";
import { Queue, Message } from "@/types/queue";
import { Topic } from "@/lib/models/Topic";
import CreateTopicDialog from "@/components/topics/CreateTopicDialog";

// Polling interval in milliseconds
const POLLING_INTERVAL = 5000;

export default function Home() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [messageDialogOpen, setMessageDialogOpen] = useState<boolean>(false);
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [updateRetentionDialogOpen, setUpdateRetentionDialogOpen] =
    useState<boolean>(false);
  const [deleteQueueDialogOpen, setDeleteQueueDialogOpen] =
    useState<boolean>(false);
  const [purgeAllQueuesDialogOpen, setPurgeAllQueuesDialogOpen] =
    useState<boolean>(false);

  // Queue update/delete states
  const [queueToUpdate, setQueueToUpdate] = useState<Queue | null>(null);
  const [queueToDelete, setQueueToDelete] = useState<Queue | null>(null);

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

  // Topics states
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isCreateTopicDialogOpen, setIsCreateTopicDialogOpen] = useState(false);
  const [isAddQueueDialogOpen, setIsAddQueueDialogOpen] = useState(false);
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>(
    {}
  );
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [isTopicLoading, setIsTopicLoading] = useState<Record<string, boolean>>(
    {}
  );

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

  // Fetch topics
  const fetchTopics = async () => {
    try {
      const response = await fetch("/api/topics");
      const data = await response.json();
      // Convert JSON data to Topic instances
      const topicInstances = data.map((topicData: any) =>
        Topic.fromJSON(topicData)
      );
      setTopics(topicInstances);

      // Initialize message inputs for each topic
      const initialMessageInputs: Record<string, string> = {};
      topicInstances.forEach((topic: Topic) => {
        initialMessageInputs[topic.getName()] = "";
      });
      setMessageInputs(initialMessageInputs);
    } catch (error) {
      console.error("Error fetching topics:", error);
    }
  };

  // Create a new queue
  const createQueue = async (name: string, retentionPeriod: string) => {
    try {
      const response = await fetch("/api/queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          retentionPeriod:
            retentionPeriod === "" ? null : Number(retentionPeriod),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create queue");
      }

      setCreateDialogOpen(false);
      fetchQueues();
      toast.success("Queue created successfully!");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to create queue");
      console.error(err);
    }
  };

  // Delete a queue completely
  const deleteQueue = async () => {
    if (!queueToDelete) return;

    try {
      const response = await fetch(`/api/queues/${queueToDelete.slug}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete queue");
      }

      // Remove the queue from the UI
      setQueues((prevQueues) =>
        prevQueues.filter((q) => q._id !== queueToDelete._id)
      );

      // If we were polling this queue, stop polling
      if (pollingQueueData && pollingQueueData._id === queueToDelete._id) {
        stopPolling();
      }

      setDeleteQueueDialogOpen(false);
      setQueueToDelete(null);
      toast.success(`Queue "${queueToDelete.name}" has been deleted`);
    } catch (err: any) {
      console.error("Failed to delete queue:", err);
      toast.error(err.message || "Failed to delete queue");
    }
  };

  // Combined purge and delete operation
  const purgeAndDeleteQueue = async () => {
    if (!queueToDelete) return;

    try {
      // First purge all messages
      const purgeResponse = await fetch(
        `/api/queues/${queueToDelete.slug}/purge`,
        {
          method: "POST",
        }
      );

      if (!purgeResponse.ok) {
        const data = await purgeResponse.json();
        throw new Error(data.error || "Failed to purge queue");
      }

      // Then delete the queue
      const deleteResponse = await fetch(`/api/queues/${queueToDelete.slug}`, {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        const data = await deleteResponse.json();
        throw new Error(data.error || "Failed to delete queue");
      }

      // Remove the queue from the UI
      setQueues((prevQueues) =>
        prevQueues.filter((q) => q._id !== queueToDelete._id)
      );

      // If we were polling this queue, stop polling
      if (pollingQueueData && pollingQueueData._id === queueToDelete._id) {
        stopPolling();
      }

      setDeleteQueueDialogOpen(false);
      setQueueToDelete(null);
      toast.success(
        `Queue "${queueToDelete.name}" has been purged and deleted`
      );
    } catch (err: any) {
      console.error("Failed to purge and delete queue:", err);
      toast.error(err.message || "Failed to purge and delete queue");
    }
  };

  // Update queue retention policy
  const updateRetentionPolicy = async (updatedRetentionPeriod: string) => {
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
  const sendMessage = async (selectedQueue: string, message: string) => {
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

  // Topic functions
  const handleCreateTopic = async (newTopic: Topic) => {
    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTopic),
      });

      if (!response.ok) {
        throw new Error("Failed to create topic");
      }

      await fetchTopics();
      setIsCreateTopicDialogOpen(false);
      toast.success("Topic created successfully");
    } catch (error) {
      console.error("Error creating topic:", error);
      toast.error("Failed to create topic");
    }
  };

  const handleDeleteTopic = async (topicName: string) => {
    if (!confirm("Are you sure you want to delete this topic?")) {
      return;
    }

    try {
      const response = await fetch(`/api/topics/${topicName}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete topic");
      }

      await fetchTopics();
      toast.success("Topic deleted successfully");
    } catch (error) {
      console.error("Error deleting topic:", error);
      toast.error("Failed to delete topic");
    }
  };

  const handleAddQueue = async () => {
    if (!selectedTopic || !selectedQueue) return;

    try {
      const response = await fetch(`/api/topics/${selectedTopic}/queues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ queueId: selectedQueue }),
      });

      if (!response.ok) {
        throw new Error("Failed to add queue");
      }

      await fetchTopics();
      setIsAddQueueDialogOpen(false);
      setSelectedQueue("");
      toast.success("Queue added to topic");
    } catch (error) {
      console.error("Error adding queue:", error);
      toast.error("Failed to add queue to topic");
    }
  };

  const handleRemoveQueue = async (topicName: string, queueId: string) => {
    try {
      const response = await fetch(
        `/api/topics/${topicName}/queues?queueId=${queueId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove queue");
      }

      await fetchTopics();
      toast.success("Queue removed from topic");
    } catch (error) {
      console.error("Error removing queue:", error);
      toast.error("Failed to remove queue from topic");
    }
  };

  const handlePublishMessage = async (topicName: string) => {
    const message = messageInputs[topicName];
    if (!message) return;

    setIsTopicLoading((prev) => ({ ...prev, [topicName]: true }));

    try {
      const response = await fetch(`/api/topics/${topicName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error("Failed to publish message");
      }

      setMessageInputs((prev) => ({ ...prev, [topicName]: "" }));
      toast.success("Message published successfully");
    } catch (error) {
      console.error("Error publishing message:", error);
      toast.error("Failed to publish message");
    } finally {
      setIsTopicLoading((prev) => ({ ...prev, [topicName]: false }));
    }
  };

  // Purge and delete ALL queues
  const purgeAndDeleteAllQueues = async () => {
    try {
      const response = await fetch(`/api/queues/purge-all`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to purge and delete all queues");
      }

      // Clear the queues from the UI
      setQueues([]);

      // If we were polling any queue, stop polling
      if (isPolling) {
        stopPolling();
      }

      setPurgeAllQueuesDialogOpen(false);
      toast.success("All queues have been purged and deleted");
    } catch (err: any) {
      console.error("Failed to purge and delete all queues:", err);
      toast.error(err.message || "Failed to purge and delete all queues");
    }
  };

  // Handle opening the purge all queues dialog
  const handleOpenPurgeAllQueues = () => {
    setPurgeAllQueuesDialogOpen(true);
  };

  // Load queues and topics on component mount
  useEffect(() => {
    fetchQueues();
    fetchTopics();
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
          <PostMessageDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            queues={queues}
            onSendMessage={sendMessage}
            disabled={queues.length === 0}
          />
          <CreateQueueDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onCreateQueue={createQueue}
          />
          <UpdateRetentionDialog
            open={updateRetentionDialogOpen}
            onOpenChange={setUpdateRetentionDialogOpen}
            queueToUpdate={queueToUpdate}
            onUpdateRetention={updateRetentionPolicy}
          />
          <DeleteQueueDialog
            open={deleteQueueDialogOpen}
            onOpenChange={setDeleteQueueDialogOpen}
            queueToDelete={queueToDelete}
            onDeleteQueue={purgeAndDeleteQueue}
          />
          <PurgeAllQueuesDialog
            open={purgeAllQueuesDialogOpen}
            onOpenChange={setPurgeAllQueuesDialogOpen}
            onPurgeAllQueues={purgeAndDeleteAllQueues}
            queueCount={queues.length}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading queues...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Queue Polling Section */}
          <QueuePollingSection
            queues={queues}
            pollingInterval={POLLING_INTERVAL}
          />

          {/* Queues Table */}
          {queues.length === 0 ? (
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
            <QueueTable
              queues={queues}
              getQueueUrl={getQueueUrl}
              onOpenUpdateRetention={(queue: Queue) => {
                setQueueToUpdate(queue);
                setUpdateRetentionDialogOpen(true);
              }}
              onOpenDeleteQueue={(queue: Queue) => {
                setQueueToDelete(queue);
                setDeleteQueueDialogOpen(true);
              }}
              onOpenPurgeAllQueues={handleOpenPurgeAllQueues}
            />
          )}

          {/* Topics Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Topics</h2>
              <Button onClick={() => setIsCreateTopicDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Topic
              </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic Name</TableHead>
                    <TableHead>Target Queues</TableHead>
                    <TableHead>Publish Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics.map((topic) => (
                    <TableRow key={topic.getName()}>
                      <TableCell className="font-medium">
                        {topic.getName()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {topic.getTargetQueueIds().map((queueId) => {
                            const queue = queues.find((q) => q._id === queueId);
                            return (
                              <div
                                key={queueId}
                                className="flex items-center bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-xs"
                              >
                                {queue?.name || queueId}
                                <button
                                  onClick={() =>
                                    handleRemoveQueue(topic.getName(), queueId)
                                  }
                                  className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTopic(topic.getName());
                              setIsAddQueueDialogOpen(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Input
                            value={messageInputs[topic.getName()] || ""}
                            onChange={(e) =>
                              setMessageInputs((prev) => ({
                                ...prev,
                                [topic.getName()]: e.target.value,
                              }))
                            }
                            placeholder="Enter message"
                            disabled={isTopicLoading[topic.getName()]}
                            className="h-8"
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              handlePublishMessage(topic.getName())
                            }
                            disabled={
                              isTopicLoading[topic.getName()] ||
                              !messageInputs[topic.getName()]
                            }
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {isTopicLoading[topic.getName()]
                              ? "Sending..."
                              : "Send"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTopic(topic.getName())}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {topics.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-4 text-gray-500"
                      >
                        No topics found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* API Usage Guide */}
          <ApiUsageGuide />
        </div>
      )}

      <CreateTopicDialog
        open={isCreateTopicDialogOpen}
        onOpenChange={setIsCreateTopicDialogOpen}
        onCreateTopic={handleCreateTopic}
      />

      <Dialog
        open={isAddQueueDialogOpen}
        onOpenChange={setIsAddQueueDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Target Queue</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Select Queue
              </label>
              <select
                value={selectedQueue}
                onChange={(e) => setSelectedQueue(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a queue...</option>
                {selectedTopic &&
                  queues
                    .filter((queue) => {
                      const topic = topics.find(
                        (t) => t.getName() === selectedTopic
                      );
                      return (
                        topic && !topic.getTargetQueueIds().includes(queue._id)
                      );
                    })
                    .map((queue) => (
                      <option key={queue._id} value={queue._id}>
                        {queue.name}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddQueueDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddQueue} disabled={!selectedQueue}>
              Add Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
