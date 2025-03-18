export interface IMessage {
  queueId: string;
  body: string;
  processed?: boolean;
  visibilityTimeout?: Date | null;
  createdAt?: Date;
  expiresAt?: Date | null;
} 