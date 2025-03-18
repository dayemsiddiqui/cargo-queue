import { connect, clearDatabase, closeDatabase, getModels } from '../utils/db-utils';

// Setup and teardown
beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe('Queue Model', () => {
  it('should create a new queue successfully', async () => {
    const { Queue } = getModels();
    const queueData = {
      name: 'Test Queue',
      slug: 'test-queue'
    };
    
    const queue = await Queue.create(queueData);
    
    expect(queue).toBeDefined();
    expect(queue.name).toBe(queueData.name);
    expect(queue.slug).toBe(queueData.slug);
    expect(queue.createdAt).toBeDefined();
  });
  
  it('should not allow duplicate queue names/slugs', async () => {
    const { Queue } = getModels();
    const queueData = {
      name: 'Test Queue',
      slug: 'test-queue'
    };
    
    await Queue.create(queueData);
    
    // Trying to create another queue with the same slug should fail
    await expect(Queue.create(queueData)).rejects.toThrow();
  });
  
  it('should require a name for the queue', async () => {
    const { Queue } = getModels();
    const queueData = {
      slug: 'test-queue'
    };
    
    // @ts-ignore - intentionally missing required field for test
    await expect(Queue.create(queueData)).rejects.toThrow();
  });
});

describe('Message Model', () => {
  let queueId: string;
  
  beforeEach(async () => {
    // Create a queue to use for message tests
    const { Queue } = getModels();
    const queue = await Queue.create({
      name: 'Test Queue',
      slug: 'test-queue'
    });
    queueId = queue._id.toString();
  });
  
  it('should create a new message successfully', async () => {
    const { Message } = getModels();
    const messageData = {
      queueId,
      body: 'Test message content',
    };
    
    const message = await Message.create(messageData);
    
    expect(message).toBeDefined();
    expect(message.body).toBe(messageData.body);
    expect(message.queueId.toString()).toBe(queueId);
    expect(message.processed).toBe(false);
    expect(message.createdAt).toBeDefined();
  });
  
  it('should require a queueId for the message', async () => {
    const { Message } = getModels();
    const messageData = {
      body: 'Test message content',
    };
    
    // @ts-ignore - intentionally missing required field for test
    await expect(Message.create(messageData)).rejects.toThrow();
  });
  
  it('should require a body for the message', async () => {
    const { Message } = getModels();
    const messageData = {
      queueId,
    };
    
    // @ts-ignore - intentionally missing required field for test
    await expect(Message.create(messageData)).rejects.toThrow();
  });
  
  it('should mark a message as processed', async () => {
    const { Message } = getModels();
    const message = await Message.create({
      queueId,
      body: 'Test message content',
    });
    
    expect(message.processed).toBe(false);
    
    message.processed = true;
    await message.save();
    
    const updatedMessage = await Message.findById(message._id);
    expect(updatedMessage).toBeDefined();
    expect(updatedMessage!.processed).toBe(true);
  });
}); 