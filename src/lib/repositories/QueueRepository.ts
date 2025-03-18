import { Queue } from '../models/Queue';

export class QueueRepository {
  async findBySlug(slug: string) {
    return Queue.findOne({ slug });
  }

  async create(data: { name: string; slug: string; retentionPeriod?: number | null }) {
    return Queue.create(data);
  }

  async findAll() {
    return Queue.find({});
  }

  async findById(id: string) {
    return Queue.findById(id);
  }

  async update(id: string, data: Partial<{ name: string; slug: string; retentionPeriod?: number | null }>) {
    return Queue.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string) {
    return Queue.findByIdAndDelete(id);
  }
}

// Singleton instance
export const queueRepository = new QueueRepository(); 