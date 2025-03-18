"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Queue } from "@/types/queue";

interface QueueTableProps {
  queues: Queue[];
  getQueueUrl: (slug: string) => string;
  onOpenUpdateRetention: (queue: Queue) => void;
  onOpenDeleteQueue: (queue: Queue) => void;
}

export default function QueueTable({
  queues,
  getQueueUrl,
  onOpenUpdateRetention,
  onOpenDeleteQueue,
}: QueueTableProps) {
  const formatRetentionPeriod = (retentionPeriod: number | null) => {
    if (
      retentionPeriod === null ||
      retentionPeriod === undefined ||
      retentionPeriod <= 0
    ) {
      return <span className="text-muted-foreground">No expiry</span>;
    }

    if (retentionPeriod < 60) {
      return `${retentionPeriod} seconds`;
    } else if (retentionPeriod < 3600) {
      return `${Math.round(retentionPeriod / 60)} minutes`;
    } else if (retentionPeriod < 86400) {
      return `${Math.round(retentionPeriod / 3600)} hours`;
    } else {
      return `${Math.round(retentionPeriod / 86400)} days`;
    }
  };

  return (
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
                  {formatRetentionPeriod(queue.retentionPeriod)}
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
                        navigator.clipboard.writeText(getQueueUrl(queue.slug));
                        toast.success("Queue URL copied to clipboard");
                      }}
                    >
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenUpdateRetention(queue)}
                    >
                      Edit Retention
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onOpenDeleteQueue(queue)}
                    >
                      Purge & Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
