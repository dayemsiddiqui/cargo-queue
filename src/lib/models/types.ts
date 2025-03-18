export interface IMessage {
  _id?: any;
  queueId: any;
  body: string;
  processed?: boolean;
  visibilityTimeout?: Date | null;
  createdAt?: Date;
  expiresAt?: Date | null;
} 