"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Queue } from "@/types/queue";

interface UpdateRetentionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queueToUpdate: Queue | null;
  onUpdateRetention: (updatedRetentionPeriod: string) => Promise<void>;
}

export default function UpdateRetentionDialog({
  open,
  onOpenChange,
  queueToUpdate,
  onUpdateRetention,
}: UpdateRetentionDialogProps) {
  const [updatedRetentionPeriod, setUpdatedRetentionPeriod] =
    useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Initialize retention period when queue changes
  useEffect(() => {
    if (queueToUpdate) {
      setUpdatedRetentionPeriod(
        queueToUpdate.retentionPeriod != null &&
          queueToUpdate.retentionPeriod > 0
          ? String(queueToUpdate.retentionPeriod)
          : ""
      );
    }
  }, [queueToUpdate]);

  const handleUpdateRetention = async () => {
    try {
      await onUpdateRetention(updatedRetentionPeriod);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to update retention policy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Retention Policy</DialogTitle>
          <DialogDescription>
            Update how long messages are kept in the "{queueToUpdate?.name}"
            queue before being automatically deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="updatedRetentionPeriod" className="text-right">
              Retention Period
            </label>
            <div className="col-span-3">
              <Input
                id="updatedRetentionPeriod"
                type="number"
                placeholder="In seconds (leave empty for no expiry)"
                value={updatedRetentionPeriod}
                onChange={(e) => setUpdatedRetentionPeriod(e.target.value)}
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
          <Button onClick={handleUpdateRetention}>
            Update Retention Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
