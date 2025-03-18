import { Queue } from './Queue';

export interface TopicConfig {
    name: string;
    targetQueueIds: string[];
}

export class Topic {
    private name: string;
    private targetQueueIds: Set<string>;

    constructor(config: TopicConfig) {
        this.name = config.name;
        this.targetQueueIds = new Set(config.targetQueueIds);
    }

    getName(): string {
        return this.name;
    }

    getTargetQueueIds(): string[] {
        return Array.from(this.targetQueueIds);
    }

    addTargetQueue(queueId: string): void {
        this.targetQueueIds.add(queueId);
    }

    removeTargetQueue(queueId: string): void {
        this.targetQueueIds.delete(queueId);
    }

    hasTargetQueue(queueId: string): boolean {
        return this.targetQueueIds.has(queueId);
    }

    toJSON() {
        return {
            name: this.name,
            targetQueueIds: Array.from(this.targetQueueIds)
        };
    }

    static fromJSON(json: any): Topic {
        return new Topic({
            name: json.name,
            targetQueueIds: json.targetQueueIds
        });
    }
} 