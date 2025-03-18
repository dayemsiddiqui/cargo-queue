import { Topic, TopicConfig } from '../models/Topic';
import { QueueService, queueService } from './QueueService';
import type { IMessage } from '../models/types';
import { topicRepository } from '../repositories/TopicRepository';
import { ApiError } from '../errors/ApiError';

export class TopicService {
    private queueService: QueueService;

    constructor(queueService: QueueService) {
        this.queueService = queueService;
    }

    async createTopic(config: TopicConfig): Promise<Topic> {
        // Check if topic already exists
        const existingTopic = await topicRepository.findByName(config.name);
        if (existingTopic) {
            throw ApiError.badRequest(`Topic ${config.name} already exists`);
        }

        // Validate that all target queues exist
        for (const queueId of config.targetQueueIds) {
            const exists = await this.queueService.queueExists(queueId);
            if (!exists) {
                throw ApiError.badRequest(`Queue ${queueId} does not exist`);
            }
        }

        return topicRepository.create(config);
    }

    async deleteTopic(topicName: string): Promise<void> {
        const topic = await this.getTopic(topicName);
        await topicRepository.delete(topicName);
    }

    async addTargetQueue(topicName: string, queueId: string): Promise<Topic> {
        const exists = await this.queueService.queueExists(queueId);
        if (!exists) {
            throw ApiError.badRequest(`Queue ${queueId} does not exist`);
        }

        const updatedTopic = await topicRepository.addTargetQueue(topicName, queueId);
        if (!updatedTopic) {
            throw ApiError.notFound(`Topic ${topicName} not found`);
        }

        return updatedTopic;
    }

    async removeTargetQueue(topicName: string, queueId: string): Promise<Topic> {
        const updatedTopic = await topicRepository.removeTargetQueue(topicName, queueId);
        if (!updatedTopic) {
            throw ApiError.notFound(`Topic ${topicName} not found`);
        }

        return updatedTopic;
    }

    async publishMessage(topicName: string, messageBody: string): Promise<void> {
        const topic = await this.getTopic(topicName);
        const targetQueueIds = topic.getTargetQueueIds();

        if (targetQueueIds.length === 0) {
            throw ApiError.badRequest(`Topic ${topicName} has no target queues`);
        }

        // Create message object
        const message: IMessage = {
            body: messageBody,
            queueId: '', // This will be set for each queue
            createdAt: new Date(),
            processed: false
        };

        // Publish message to all target queues
        const publishPromises = targetQueueIds.map(queueId =>
            this.queueService.enqueueMessage(queueId, message)
        );

        await Promise.all(publishPromises);
    }

    async getTopic(topicName: string): Promise<Topic> {
        const topic = await topicRepository.findByName(topicName);
        if (!topic) {
            throw ApiError.notFound(`Topic ${topicName} not found`);
        }
        return topic;
    }

    async listTopics(): Promise<Topic[]> {
        return topicRepository.findAll();
    }

    async getTopicTargetQueues(topicName: string): Promise<string[]> {
        const topic = await this.getTopic(topicName);
        return topic.getTargetQueueIds();
    }
}

// Create a singleton instance
export const topicService = new TopicService(queueService); 