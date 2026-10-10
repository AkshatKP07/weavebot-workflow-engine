import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { ENV } from './env.js';

// Check if we are using a secure cloud Redis URL (Upstash)
const isCloudRedis = ENV.REDIS_URI.startsWith('rediss://');

export const queueConnection = new IORedis(ENV.REDIS_URI, {
  maxRetriesPerRequest: null,
  // If it's a cloud URL, add the required TLS configuration
  ...(isCloudRedis && {
    tls: {
      rejectUnauthorized: false // Prevents certificate validation errors in cloud environments
    }
  })
});

export const workflowQueue = new Queue('workflow-queue', { 
  connection: queueConnection 
});