import mongoose from 'mongoose';

// Mock the module
const mockMongoose = {
  ...mongoose,
  connect: jest.fn(),
  connection: {
    ...mongoose.connection,
    on: jest.fn(),
    once: jest.fn(),
    close: jest.fn(),
  },
};

export default mockMongoose; 