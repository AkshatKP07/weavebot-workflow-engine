import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import _ from 'lodash';

import { encrypt, decrypt } from './utils/crypto.js';
import { getIntegration, listIntegrations } from './integrations/registry.js';
import { executeAI } from './ai/router.js';
import { queryKnowledgeBase, seedMockDatabase } from './ai/rag.js';
import { sanitizeGraphForTemplate, instantiateTemplateGraph } from './utils/templateEngine.js';

const app = express();

// 1. Initialize Prisma Database Client (Prisma 7 Adapter)
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

// 2. IORedis Client (Required by BullMQ for background queues)
const queueConnection = new IORedis(process.env.REDIS_URI, {
  maxRetriesPerRequest: null,
});

// 3. Initialize the Job Queue
const workflowQueue = new Queue('workflow-queue', { connection: queueConnection });

app.use(cors()); 
app.use(express.json()); 


// ==========================================
// --- ENGINE UTILITIES (THE BRAIN) ---------
// ==========================================

function compileTemplate(templateString, context) {
  if (!templateString) return '';
  // Handles variable spacing safely: {{ var }} or {{var}}
  return templateString.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, path) => {
    // Safely extract deeply nested variables without crashing
    const value = _.get(context, path.trim());
    
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

function topologicalSort(nodes, edges) {
  const inDegree = {};
  const adjList = {};
  const sorted = [];
  
  nodes.forEach(node => {
    inDegree[node.id] = 0;
    adjList[node.id] = [];
  });
  
  edges.forEach(edge => {
    if (adjList[edge.source]) {
      adjList[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  });
  
  const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
  
  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);
    
    adjList[current].forEach(neighbor => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }
  
  if (sorted.length !== nodes.length) throw new Error("Cycle detected!");
  return sorted;
}


// ==========================================
// --- API ROUTES (WORKFLOWS) ---------------
// ==========================================

app.post('/api/workflows', async (req, res) => {
  try {
    const { name, graph } = req.body;
    
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'founder@yc.com', name: 'YC Founder' }
      });
    }

    const workflow = await prisma.workflow.create({
      data: {
        name: name || "Untitled",
        graph: graph,
        userId: user.id
      }
    });

    console.log("💾 [API] Saved workflow to SQLite DB:", workflow.id);
    res.json(workflow);
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ error: "Failed to save workflow" });
  }
});

app.get('/api/workflows', async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load workflows" });
  }
});

app.delete('/api/workflows', async (req, res) => {
  try {
    await prisma.workflow.deleteMany();
    console.log("🗑️ [API] SQLite Database wiped clean. All workflows deleted.");
    res.json({ success: true, message: "All workflows cleared" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete workflows" });
  }
});


// ==========================================
// --- DISCOVER MARKETPLACE (TEMPLATES) -----
// ==========================================

// 1. Publish a workflow to the public marketplace
app.post('/api/templates/publish/:workflowId', async (req, res) => {
  try {
    const originalWorkflow = await prisma.workflow.findUnique({
      where: { id: req.params.workflowId }
    });

    if (!originalWorkflow) return res.status(404).json({ error: "Workflow not found" });

    // Scrub the user's private data out of the graph
    const cleanGraph = sanitizeGraphForTemplate(originalWorkflow.graph);

    // Save as a public template
    const template = await prisma.workflow.create({
      data: {
        name: `${originalWorkflow.name} (Template)`,
        description: "A community template.",
        graph: cleanGraph,
        isTemplate: true,
        userId: originalWorkflow.userId // Assigning to original creator
      }
    });

    console.log(`🌍 [MARKETPLACE] Published template: ${template.id}`);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: "Failed to publish template" });
  }
});

// 2. Fetch all public templates for the Discover UI
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await prisma.workflow.findMany({
      where: { isTemplate: true }
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Failed to load templates" });
  }
});

// 3. User clicks "Use Template" -> Clones it into their workspace
app.post('/api/templates/use/:templateId', async (req, res) => {
  try {
    const template = await prisma.workflow.findUnique({
      where: { id: req.params.templateId }
    });

    if (!template) return res.status(404).json({ error: "Template not found" });

    // Generate fresh node/edge IDs so it doesn't conflict in React Flow
    const instantiatedGraph = instantiateTemplateGraph(template.graph);

    let user = await prisma.user.findFirst();

    const newWorkflow = await prisma.workflow.create({
      data: {
        name: `Copy of ${template.name}`,
        graph: instantiatedGraph,
        isTemplate: false,
        userId: user.id
      }
    });

    console.log(`📥 [MARKETPLACE] User cloned template into workspace: ${newWorkflow.id}`);
    res.json(newWorkflow);
  } catch (error) {
    res.status(500).json({ error: "Failed to instantiate template" });
  }
});


// ==========================================
// --- INTEGRATION & CREDENTIAL ENDPOINTS ---
// ==========================================

// List available third-party integrations
app.get('/api/integrations', (req, res) => {
  res.json(listIntegrations());
});

// Save user credentials (Encrypted)
app.post('/api/credentials', async (req, res) => {
  try {
    const { provider, data } = req.body;
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({ data: { email: 'founder@yc.com', name: 'YC Founder' } });
    }

    const encryptedData = encrypt(JSON.stringify(data));

    const credential = await prisma.credential.upsert({
      where: {
        userId_provider: { userId: user.id, provider }
      },
      update: { accessToken: encryptedData },
      create: {
        provider,
        accessToken: encryptedData,
        userId: user.id
      }
    });

    console.log(`🔒 [CREDENTIALS] Secured & saved key for provider: ${provider}`);
    res.json({ success: true, provider: credential.provider });
  } catch (error) {
    console.error("Credential Save Error:", error);
    res.status(500).json({ error: "Failed to save credential" });
  }
});

// Get user's active integration connections (Masked for safety)
app.get('/api/credentials', async (req, res) => {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return res.json([]);

    const credentials = await prisma.credential.findMany({
      where: { userId: user.id },
      select: { id: true, provider: true, createdAt: true }
    });

    res.json(credentials);
  } catch (error) {
    res.status(500).json({ error: "Failed to load credentials" });
  }
});


// ==========================================
// --- WEBHOOK CATCHER (PRODUCER) -----------
// ==========================================

app.post('/webhook/:endpoint', async (req, res) => {
  const { endpoint } = req.params;
  const incomingData = req.body; 
  
  console.log(`\n⚡ [WEBHOOK] Triggered at: /webhook/${endpoint}`);
  
  try {
    const workflows = await prisma.workflow.findMany();
    if (workflows.length === 0) return res.status(404).json({ error: "No workflows found" });
    
    let targetWorkflow = null;
    for (const wf of workflows) {
      if (!wf || !wf.graph || !wf.graph.nodes) continue;
      
      const hasTrigger = wf.graph.nodes.some(n => n.type === 'trigger' && n.data.label === `/webhook/${endpoint}`);
      if (hasTrigger) {
        targetWorkflow = wf;
        break; 
      }
    }
    
    if (!targetWorkflow) return res.status(404).json({ error: "No matching workflow found" });
    
    const job = await workflowQueue.add('execute-graph', {
      workflow: targetWorkflow,
      payload: incomingData
    });

    console.log(`📥 [QUEUE] Job ${job.id} added to BullMQ.`);

    return res.json({ 
      success: true, 
      message: "Webhook caught! Job queued.",
      jobId: job.id
    });

  } catch (error) {
    console.error("❌ [WEBHOOK] Crash:", error);
    res.status(500).json({ error: "Failed to queue workflow" });
  }
});


// ==========================================
// --- BACKGROUND WORKER (CONSUMER) ---------
// ==========================================

const worker = new Worker('workflow-queue', async (job) => {
  const { workflow, payload } = job.data;
  console.log(`\n👷 [WORKER] Picked up Job ${job.id} for workflow: ${workflow.id}`);
  
  const executionOrder = topologicalSort(workflow.graph.nodes, workflow.graph.edges || []);
  const stepResults = {}; 
  let finalResult = null;

  for (const nodeId of executionOrder) {
    const node = workflow.graph.nodes.find(n => n.id === nodeId);
    
    // 1. TRIGGER NODE
    if (node.type === 'trigger') {
      stepResults[node.id] = payload; 
      continue;
    }
    
    // 2. FILTER NODE
    if (node.type === 'filter') {
      const filterKey = node.data.filterKey || '';
      const filterOperator = node.data.filterOperator || '==';
      const filterValue = node.data.filterValue || '';
      
      const context = { forwardedData: payload, steps: stepResults };
      const actualValue = _.get(context, filterKey.trim());

      let passed = false;
      const strActual = String(actualValue);
      const strTarget = String(filterValue);
      if (filterOperator === '==') passed = (strActual === strTarget);
      if (filterOperator === '!=') passed = (strActual !== strTarget);

      if (!passed) {
        console.log(`🛑 [WORKER] Filter condition failed. Halting workflow.`);
        return { haltedAt: node.id, reason: "Filter failed" }; 
      }
      stepResults[node.id] = { passed: true }; 
      continue;
    }
    
    // 3. MULTI-MODEL AI NODE
    if (node.type === 'ai') {
      const context = { forwardedData: payload, steps: stepResults };
      const compiledPrompt = compileTemplate(node.data.prompt, context);
      const provider = node.data.provider || 'gemini'; 
      
      console.log(`✨ [WORKER] Executing AI (${provider}) -> "${compiledPrompt.substring(0, 50)}..."`);
      
      try {
        const aiResult = await executeAI({ 
          provider: provider, 
          prompt: compiledPrompt 
        });
        
        console.log(`✅ [WORKER] AI Generation successful!`);
        if (aiResult?.generatedText) {
          console.log(`🤖 [AI OUTPUT]:\n${aiResult.generatedText}\n`);
        }
        
        stepResults[node.id] = aiResult;
        
      } catch (error) {
        console.error(`❌ [WORKER] AI Node Failed:`, error.message);
        stepResults[node.id] = { error: error.message };
      }
      continue;
    }

    // 4. KNOWLEDGE BASE / RAG NODE
    if (node.type === 'knowledge_base') {
      const databaseId = node.data.databaseId || 'mock_db';
      const maxChunks = node.data.maxChunks || 2;
      
      const queryText = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      console.log(`📚 [WORKER] Querying Knowledge Base -> ${databaseId} for chunks: ${maxChunks}`);
      
      try {
        const ragResult = await queryKnowledgeBase(queryText, maxChunks);
        stepResults[node.id] = ragResult;
        console.log(`✅ [WORKER] RAG retrieval successful! Found context.`);
      } catch (error) {
        console.error(`❌ [WORKER] RAG Node Failed:`, error.message);
        stepResults[node.id] = { error: error.message };
      }
      continue;
    }

    // 5. THIRD-PARTY INTEGRATION NODE
    if (node.type === 'integration') {
      const context = { forwardedData: payload, steps: stepResults };
      const provider = node.data.provider; // e.g. "discord" or "custom_api"
      
      console.log(`🔌 [WORKER] Running Integration -> ${provider}`);

      const integration = getIntegration(provider);
      if (!integration) throw new Error(`Unsupported integration provider: ${provider}`);

      const user = await prisma.user.findFirst();
      const savedCred = user ? await prisma.credential.findUnique({
        where: { userId_provider: { userId: user.id, provider } }
      }) : null;

      let decryptedCredData = null;
      if (savedCred?.accessToken) {
        decryptedCredData = JSON.parse(decrypt(savedCred.accessToken));
      }

      // Dynamically compile template values for integration attributes
      const compiledNodeData = {};
      for (const [key, val] of Object.entries(node.data)) {
        compiledNodeData[key] = typeof val === 'string' ? compileTemplate(val, context) : val;
      }

      try {
        const result = await integration.execute({
          context,
          nodeData: compiledNodeData,
          credential: { data: decryptedCredData }
        });
        stepResults[node.id] = result;
        console.log(`✅ [WORKER] Integration ${provider} executed successfully.`);
      } catch (err) {
        console.error(`❌ [WORKER] Integration ${provider} Failed:`, err.message);
        stepResults[node.id] = { error: err.message };
      }
      continue;
    }

    // 6. GENERIC HTTP ACTION NODE
    if (node.type === 'action') {
      const context = { forwardedData: payload, steps: stepResults };
      const compiledUrl = compileTemplate(node.data.label, context);
      console.log(`🚀 [WORKER] Executing Action -> POST ${compiledUrl}`);
      
      try {
        const actionResponse = await fetch(compiledUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalData: payload, injectedContext: stepResults })
        });
        
        const rawText = await actionResponse.text();
        try {
          stepResults[node.id] = JSON.parse(rawText);
        } catch (err) {
          stepResults[node.id] = { rawResponse: rawText.substring(0, 200) }; 
        }
      } catch (error) {
        console.error(`❌ [WORKER] Action Node Failed:`, error.message);
        stepResults[node.id] = { error: error.message };
      }
      finalResult = stepResults[node.id];
    }
  }

  // Save the completed execution run to SQLite for dashboard logs
  try {
    await prisma.execution.create({
      data: {
        workflowId: workflow.id,
        status: "COMPLETED",
        triggerData: payload,
        resultData: finalResult || stepResults,
        logs: stepResults,
        completedAt: new Date()
      }
    });
    console.log(`💾 [WORKER] Execution record persisted to database.`);
  } catch (execErr) {
    console.error(`⚠️ [WORKER] Failed to persist execution record:`, execErr.message);
  }

  return finalResult || stepResults;
}, { connection: queueConnection });

worker.on('completed', (job) => {
  console.log(`✅ [WORKER] Job ${job.id} completed successfully!`);
});

worker.on('failed', (job, error) => {
  console.error(`❌ [WORKER] Job ${job.id} failed:`, error);
});

const PORT = 3001;
app.listen(PORT, async () => {
  console.log(`🚀 API & Background Worker running on http://localhost:${PORT}`);
  // Seed our mock vector DB when the server starts
  await seedMockDatabase();
});