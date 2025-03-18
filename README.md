# Cargo Queue

A simple message queue service similar to AWS SQS or Google PubSub.

## Features

- Create message queues with unique URLs
- Send messages to queues
- Poll messages from queues
- Acknowledge (delete) messages
- Admin dashboard for queue management

## Tech Stack

- **Frontend**: Next.js, React, ShadCN UI
- **Backend**: Next.js API Routes
- **Database**: MongoDB

## Getting Started

### Prerequisites

- Node.js 18+ and MongoDB (for local setup)
- Docker and Docker Compose (for containerized setup)

### Option 1: Docker Setup (Recommended)

This approach uses Docker Compose to set up both the application and MongoDB:

1. Clone the repository
2. Start the services:
   ```bash
   docker-compose up
   ```
3. Run the main app via `npm run dev`

To stop the services:

```bash
docker-compose down
```

## Testing

The project includes both unit and integration tests for the backend API endpoints and database models. The tests are written using Jest and follow best practices for testing Next.js API routes and MongoDB models.

### Running Tests

To run all tests:

```bash
npm test
```
