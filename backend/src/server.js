// src/server.js
import express from 'express';
import cors from 'cors';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

import { ENV } from './config/env.js';
import { seedMockDatabase } from './ai/rag.js';

// Import Routers
import workflowsRouter from './routes/workflows.js';
import marketplaceRouter from './routes/marketplace.js';
import credentialsRouter from './routes/credentials.js';
import webhooksRouter from './routes/webhooks.js';
import knowledgeRouter from './routes/knowledge.js';

import './worker/executor.js';

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // Your Vite frontend URL
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'] // Explicitly allow Clerk tokens
}));

// 1. SECURITY ARMOR: Strict 1MB payload limit (Prevents OOM Poison Pills)
app.use(express.json({ limit: '1mb' })); 

// 1. PUBLIC ROUTES (No login required)
// External apps like Discord or Stripe must be able to trigger your webhooks!
app.use('/webhook', webhooksRouter);

// 2. PROTECTED ROUTES (Requires Clerk JWT token)
// This automatically verifies the token and attaches `req.auth.userId`
app.use('/api', ClerkExpressRequireAuth({}), (err, req, res, next) => {
  if (err.message === 'Unauthenticated') {
    return res.status(401).json({ error: 'Unauthenticated API Request' });
  }
  next(err);
});

// Mount Protected API Routes
app.use('/api/workflows', workflowsRouter);
app.use('/api/templates', marketplaceRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api', credentialsRouter);

// 3. SECURITY ARMOR: Global Error Handler (Prevents Stack Trace / Path Leaks)
app.use((err, req, res, next) => {
  // Catch the Express body-parser payload limit error
  if (err.type === 'entity.too.large') {
    console.warn(`⚠️ [SERVER] Blocked oversized payload (${req.method} ${req.url})`);
    return res.status(413).json({ 
      error: 'Payload Too Large', 
      message: 'The request body exceeds the 1MB limit.' 
    });
  }

  // Catch malformed JSON syntax errors
  if (err.type === 'entity.parse.failed') {
    console.warn(`⚠️ [SERVER] Blocked malformed JSON (${req.method} ${req.url})`);
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid JSON payload.' });
  }
  
  // Generic fallback for any other unhandled errors
  console.error(`❌ [SERVER] Unhandled Error:`, err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Boot Server
app.listen(ENV.PORT, async () => {
  console.log(`🚀 API & Background Worker running on port ${ENV.PORT}`);
  await seedMockDatabase();
});