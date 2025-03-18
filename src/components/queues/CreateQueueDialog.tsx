"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateQueue: (name: string, retentionPeriod: string) => Promise<void>;
}

export default function CreateQueueDialog({
  open,
  onOpenChange,
  onCreateQueue,
}: CreateQueueDialogProps) {
  const [newQueueName, setNewQueueName] = useState<string>("");
  const [retentionPeriod, setRetentionPeriod] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleCreateQueue = async () => {
    if (!newQueueName.trim()) {
      setError("Queue name is required");
      return;
    }

    await onCreateQueue(newQueueName, retentionPeriod);
    setNewQueueName("");
    setRetentionPeriod("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Create Queue</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new queue</DialogTitle>
          <DialogDescription>
            Enter a name for your new queue and optionally set a retention
            period. Messages will be automatically deleted after the retention
            period expires.
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
                Time in seconds before messages are automatically deleted. Leave
                empty to keep messages indefinitely.
              </p>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleCreateQueue} disabled={!newQueueName.trim()}>
            Create Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
