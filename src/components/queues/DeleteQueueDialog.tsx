"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Queue } from "@/types/queue";

interface DeleteQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queueToDelete: Queue | null;
  onDeleteQueue: () => Promise<void>;
}

export default function DeleteQueueDialog({
  open,
  onOpenChange,
  queueToDelete,
  onDeleteQueue,
}: DeleteQueueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purge & Delete Queue</DialogTitle>
          <DialogDescription>
            Are you sure you want to purge and delete the queue "
            {queueToDelete?.name}"? This will permanently remove all messages
            and the queue itself. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDeleteQueue}>
            Purge & Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
