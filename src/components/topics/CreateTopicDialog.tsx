"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Topic } from "@/lib/models/Topic";

interface CreateTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTopic: (topic: Topic) => void;
}

export default function CreateTopicDialog({
  open,
  onOpenChange,
  onCreateTopic,
}: CreateTopicDialogProps) {
  const [name, setName] = useState("");
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [availableQueues, setAvailableQueues] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchQueues();
    }
  }, [open]);

  const fetchQueues = async () => {
    try {
      const response = await fetch("/api/queues");
      const data = await response.json();
      setAvailableQueues(data.queues || []);
    } catch (error) {
      console.error("Error fetching queues:", error);
      setAvailableQueues([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newTopic = {
        name,
        targetQueueIds: selectedQueues,
      };

      await onCreateTopic(newTopic as Topic);
      setName("");
      setSelectedQueues([]);
    } catch (error) {
      console.error("Error creating topic:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueueSelect = (queueId: string) => {
    if (selectedQueues.includes(queueId)) {
      setSelectedQueues(selectedQueues.filter((id) => id !== queueId));
    } else {
      setSelectedQueues([...selectedQueues, queueId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Topic</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Topic Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter topic name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Target Queues
            </label>
            <div className="space-y-2">
              {availableQueues.map((queue) => (
                <div key={queue._id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={queue._id}
                    checked={selectedQueues.includes(queue._id)}
                    onChange={() => handleQueueSelect(queue._id)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={queue._id} className="text-sm">
                    {queue.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? "Creating..." : "Create Topic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
