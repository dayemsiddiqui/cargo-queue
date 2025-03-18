export interface Queue {
  _id: string;
  name: string;
  slug: string;
  retentionPeriod: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
} 