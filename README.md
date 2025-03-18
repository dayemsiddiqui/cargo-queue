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

## API Usage

### Create a Queue

Use the admin dashboard to create a new queue.

### Send a Message

```bash
curl -X POST "http://localhost:3000/api/queues/{queue-slug}/messages" \
  -H "Content-Type: application/json" \
  -d '{"message":"Your message content"}'
```

### Poll a Message

```bash
curl -X GET "http://localhost:3000/api/queues/{queue-slug}/messages"
```

### Acknowledge (Delete) a Message

```bash
curl -X DELETE "http://localhost:3000/api/queues/{queue-slug}/messages?messageId={message-id}"
```

## Testing

The project includes both unit and integration tests for the backend API endpoints and database models. The tests are written using Jest and follow best practices for testing Next.js API routes and MongoDB models.

### Running Tests

To run all tests:

```bash
npm test
```

### Test Structure

The tests are organized into the following directories:

- `src/__tests__/backend/`: Contains all backend tests
  - `Queue.test.ts`: Tests for Queue and Message models
  - `QueuesApi.test.ts`: Tests for queue-related API endpoints
  - `MessagesApi.test.ts`: Tests for message-related API endpoints

### Test Coverage

The test suite covers:

- Database models

  - Creating queues and messages
  - Validating required fields
  - Handling duplicate entries
  - Processing messages

- API Endpoints
  - Creating queues
  - Listing queues
  - Sending messages to queues
  - Polling messages from queues
  - Acknowledging messages
