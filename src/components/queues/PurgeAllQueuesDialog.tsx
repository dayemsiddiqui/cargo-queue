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

interface PurgeAllQueuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurgeAllQueues: () => void;
  queueCount: number;
}

export default function PurgeAllQueuesDialog({
  open,
  onOpenChange,
  onPurgeAllQueues,
  queueCount,
}: PurgeAllQueuesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            ⚠️ Purge & Delete ALL Queues
          </DialogTitle>
          <DialogDescription className="pt-2">
            <p className="mb-2">
              <strong>Warning:</strong> You are about to purge and delete{" "}
              <strong>ALL {queueCount} queues</strong> and their messages from
              the database.
            </p>
            <p className="mb-2">
              This action is <strong>irreversible</strong> and will result in
              the permanent loss of all queue data.
            </p>
            <p className="font-semibold">
              Are you absolutely sure you want to proceed?
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onPurgeAllQueues}>
            Purge & Delete ALL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
