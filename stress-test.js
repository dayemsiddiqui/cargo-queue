import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const queueCreationTrend = new Trend('queue_creation_time');
const messagePushTrend = new Trend('message_push_time');
const messagePollTrend = new Trend('message_poll_time');
const errorRate = new Rate('errors');
const messageCounter = new Counter('pushed_messages');
const polledMessageCounter = new Counter('polled_messages');

// Check if we're running in light mode
const isLightMode = __ENV.LIGHT === 'true';

// Dashboard info for report summary
const DASHBOARD_URL = 'http://127.0.0.1:5665';

export const options = {
  // Stress test configuration
  stages:  [
        // Light mode - shorter duration, fewer users
        { duration: '5s', target: 10 },   // Ramp up to 10 users
        { duration: '5s', target: 50 },    // Ramp up to 50 users
        { duration: '5s', target: 0 },    // Ramp down to 0 users
      ],
  // No performance thresholds - just collect metrics without enforcing limits
  summaryTimeUnit: 'ms',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

const BASE_URL = 'http://localhost:3000/api';
const QUEUE_SLUGS = []; // Store created queue slugs for subsequent operations

// Generate a slug from a name
function generateSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function setup() {
  console.log(`\n🚀 Starting ${isLightMode ? 'light' : 'full'} stress test...`);
  console.log(`📊 View real-time results at: ${DASHBOARD_URL}\n`);
  
  // Create a test queue that we can use throughout the test
  const queueName = `Stress Queue ${randomString(8)}`;
  const queueSlug = generateSlug(queueName);
  const setupPayload = JSON.stringify({
    name: queueName,
    retentionPeriod: 60 * 60 // 1 hour in seconds
  });

  const setupResponse = http.post(`${BASE_URL}/queues`, setupPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (setupResponse.status === 201) {
    try {
      const responseData = JSON.parse(setupResponse.body);
      const queueData = responseData.queue;
      const queueSlug = queueData.slug;
      console.log(`✅ Created test queue with slug: ${queueSlug}`);
      
      // Pre-populate with a few messages to ensure polling works immediately
      for (let i = 0; i < 10; i++) {
        const messagePayload = JSON.stringify({
          message: `Setup message ${i}`
        });
        
        http.post(`${BASE_URL}/queues/${queueSlug}/messages`, messagePayload, {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return { queueSlug };
    } catch (e) {
      console.log(`❌ Failed to parse response: ${e.message}`);
      console.log(`Response body: ${setupResponse.body}`);
      return {};
    }
  } else {
    console.log(`❌ Setup failed: ${setupResponse.status} ${setupResponse.body}`);
    return {};
  }
}

export default function(data) {
  // Use either a previously created queue or the setup queue
  const queueSlug = QUEUE_SLUGS.length > 0 ? 
    QUEUE_SLUGS[Math.floor(Math.random() * QUEUE_SLUGS.length)] : 
    data.queueSlug;
  
  if (!queueSlug) {
    // If no queue is available, create one
    group('Create queue', function() {
      const queueName = `Queue ${randomString(8)}`;
      const newQueueSlug = generateSlug(queueName);
      const payload = JSON.stringify({
        name: queueName,
        retentionPeriod: 3600 // 1 hour in seconds
      });
      
      const response = http.post(`${BASE_URL}/queues`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      const success = check(response, {
        'Queue creation successful': (r) => r.status === 201,
      });
      
      if (success) {
        try {
          const responseData = JSON.parse(response.body);
          const queueData = responseData.queue;
          const createdQueueSlug = queueData.slug;
          if (createdQueueSlug) {
            QUEUE_SLUGS.push(createdQueueSlug);
          }
        } catch (e) {
          console.log('Failed to parse response:', e);
          console.log(`Response body: ${response.body}`);
          errorRate.add(1);
        }
      } else {
        errorRate.add(1);
        console.log(`Queue creation failed: ${response.status} ${response.body}`);
      }
      
      queueCreationTrend.add(response.timings.duration);
    });
    
    // If we couldn't get or create a queue, skip this iteration
    if (QUEUE_SLUGS.length === 0 && !data.queueSlug) {
      console.log('No queue available for testing');
      return;
    }
  }
  
  // Get the queue slug for this iteration
  const currentQueueSlug = QUEUE_SLUGS.length > 0 ? 
    QUEUE_SLUGS[Math.floor(Math.random() * QUEUE_SLUGS.length)] : 
    data.queueSlug;
  
  // Randomize which test to run - 50/50 split between push and poll
  const testType = Math.random();
  
  if (testType < 0.5) {
    // 50% chance: Push a single message to the queue
    group('Push message', function() {
      const messagePayload = JSON.stringify({
        message: `Message ${randomString(16)}`
      });
      
      const response = http.post(`${BASE_URL}/queues/${currentQueueSlug}/messages`, messagePayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      const success = check(response, {
        'Push message successful': (r) => r.status === 201 || r.status === 200,
      });
      
      if (success) {
        messageCounter.add(1);
      } else {
        errorRate.add(1);
        console.log(`Push message failed: ${response.status} ${response.body}`);
      }
      
      messagePushTrend.add(response.timings.duration);
      sleep(Math.random() * 0.5); // Random sleep up to 0.5 seconds
    });
  } else {
    // 50% chance: Poll for messages
    group('Poll messages', function() {
      const response = http.get(`${BASE_URL}/queues/${currentQueueSlug}/messages`);
      
      const success = check(response, {
        'Poll messages successful': (r) => r.status === 200,
      });
      
      if (success) {
        try {
          const responseData = JSON.parse(response.body);
          const message = responseData.message;
          
          if (message) {
            polledMessageCounter.add(1);
            
            // Acknowledge the message
            const messageId = message._id;
            if (messageId) {
              const deleteUrl = `${BASE_URL}/queues/${currentQueueSlug}/messages?messageId=${messageId}`;
              const deleteResponse = http.del(deleteUrl, null, {
                headers: { 'Content-Type': 'application/json' },
              });
              
              if (deleteResponse.status !== 200) {
                console.log(`Failed to acknowledge message: ${deleteResponse.status} ${deleteResponse.body}`);
              }
            }
          }
        } catch (e) {
          errorRate.add(1);
          console.log(`Poll message parse error: ${e.message}`);
          console.log(`Response body: ${response.body}`);
        }
      } else {
        errorRate.add(1);
        console.log(`Poll message failed: ${response.status} ${response.body}`);
      }
      
      messagePollTrend.add(response.timings.duration);
      sleep(Math.random() * 0.5); // Random sleep up to 0.5 seconds
    });
  }
}

export function handleSummary(data) {
  console.log('\n');
  console.log('=============================================');
  console.log('📊 STRESS TEST SUMMARY');
  console.log('=============================================');
  console.log(`✅ Total Messages Pushed: ${data.metrics.pushed_messages?.values?.count || 0}`);
  console.log(`✅ Total Messages Polled: ${data.metrics.polled_messages?.values?.count || 0}`);
  console.log(`❌ Error Rate: ${(data.metrics.errors?.values?.rate || 0) * 100}%`);
  console.log('=============================================');
  console.log(`🔍 View detailed results at: ${DASHBOARD_URL}`);
  console.log('=============================================');
  
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
} 