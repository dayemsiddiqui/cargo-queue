"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Queue } from "@/types/queue";

interface PostMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queues: Queue[];
  onSendMessage: (selectedQueue: string, message: string) => Promise<void>;
  disabled?: boolean;
}

export default function PostMessageDialog({
  open,
  onOpenChange,
  queues,
  onSendMessage,
  disabled = false,
}: PostMessageDialogProps) {
  const [selectedQueue, setSelectedQueue] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!selectedQueue || !message.trim()) {
      setError("Both queue and message are required");
      return;
    }

    try {
      await onSendMessage(selectedQueue, message);
      // Reset form on success
      setSelectedQueue("");
      setMessage("");
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
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
              <Select onValueChange={setSelectedQueue} value={selectedQueue}>
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
            onClick={handleSendMessage}
            disabled={!selectedQueue || !message.trim()}
          >
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
