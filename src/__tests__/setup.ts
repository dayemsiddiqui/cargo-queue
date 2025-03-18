// Mock the mongoose module to prevent automatic connections in the background
jest.mock('@/lib/db', () => {
  const mongoose = require('mongoose');
  
  // Create a mock mongoose that doesn't automatically connect
  return {
    __esModule: true,
    default: {
      ...mongoose,
      connect: jest.fn(),
      connection: {
        ...mongoose.connection,
        on: jest.fn(),
        once: jest.fn(),
      }
    }
  };
}); 