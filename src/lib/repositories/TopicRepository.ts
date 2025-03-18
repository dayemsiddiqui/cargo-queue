import mongoose from 'mongoose';
import { Topic } from '../models/Topic';

// Define the MongoDB schema for topics
const topicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    targetQueueIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Queue'
    }]
}, {
    timestamps: true
});

// Create the model
const TopicModel = mongoose.models.Topic || mongoose.model('Topic', topicSchema);

class TopicRepository {
    async create(topicConfig: { name: string; targetQueueIds: string[] }) {
        const topic = await TopicModel.create(topicConfig);
        return Topic.fromJSON(topic.toJSON());
    }

    async findByName(name: string) {
        const topic = await TopicModel.findOne({ name });
        return topic ? Topic.fromJSON(topic.toJSON()) : null;
    }

    async findAll() {
        const topics = await TopicModel.find();
        return topics.map(topic => Topic.fromJSON(topic.toJSON()));
    }

    async update(name: string, topicConfig: Partial<{ name: string; targetQueueIds: string[] }>) {
        const topic = await TopicModel.findOneAndUpdate(
            { name },
            { $set: topicConfig },
            { new: true }
        );
        return topic ? Topic.fromJSON(topic.toJSON()) : null;
    }

    async delete(name: string) {
        await TopicModel.deleteOne({ name });
    }

    async addTargetQueue(name: string, queueId: string) {
        const topic = await TopicModel.findOneAndUpdate(
            { name },
            { $addToSet: { targetQueueIds: queueId } },
            { new: true }
        );
        return topic ? Topic.fromJSON(topic.toJSON()) : null;
    }

    async removeTargetQueue(name: string, queueId: string) {
        const topic = await TopicModel.findOneAndUpdate(
            { name },
            { $pull: { targetQueueIds: queueId } },
            { new: true }
        );
        return topic ? Topic.fromJSON(topic.toJSON()) : null;
    }
}

export const topicRepository = new TopicRepository(); 