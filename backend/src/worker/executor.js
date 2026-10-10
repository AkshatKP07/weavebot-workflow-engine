// src/worker/executor.js
import { Worker } from 'bullmq';
import _ from 'lodash';
import dns from 'dns/promises';
import net from 'net';
import { prisma } from '../config/db.js';
import { queueConnection } from '../config/queue.js';

import { decrypt } from '../utils/crypto.js';
import { getIntegration } from '../integrations/registry.js';
import { executeAI } from '../ai/router.js';
import { queryKnowledgeBase } from '../ai/rag.js';

// Helper to check for all private/loopback/internal IP blocks
function isPrivateIP(ip) {
  return (
    ip === '::1' ||
    ip === '0.0.0.0' ||
    ip === '::' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
    ip.toLowerCase().startsWith('fe80:') ||
    /^[0:]+1$/.test(ip) ||
    ip === '169.254.169.254' // Cloud Metadata protection
  );
}

async function assertPublicUrl(urlString) {
  try {
    const parsedUrl = new URL(urlString);
    const hostname = parsedUrl.hostname.toLowerCase();

    // 1. Block non-HTTP protocols (e.g. file://, gopher://, ftp://)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Security restriction: Unsupported protocol "${parsedUrl.protocol}".`);
    }

    // 2. Immediate check if the user typed a raw private IP
    if (net.isIP(hostname) && isPrivateIP(hostname)) {
      throw new Error(`Security restriction: Target IP "${hostname}" is blocked.`);
    }

    // 3. Resolve the DNS to catch Magic DNS bypasses (like nip.io)
    try {
      const lookup = await dns.lookup(hostname);
      if (isPrivateIP(lookup.address)) {
        throw new Error(`Security restriction: Target hostname "${hostname}" resolves to blocked internal IP "${lookup.address}".`);
      }
    } catch (err) {
      if (err.message.includes('Security restriction')) throw err;
      throw new Error(`DNS resolution failed for hostname "${hostname}".`);
    }
  } catch (err) {
    throw new Error(`Invalid or disallowed destination URL: ${err.message}`);
  }
}


// Recursively scrubs sensitive keys and values from objects before database insertion
function sanitizeLogs(data) {
  if (typeof data !== 'object' || data === null) return data;
  if (Array.isArray(data)) return data.map(sanitizeLogs);

  const sanitized = {};
  const sensitiveKeys = ['authorization', 'apikey', 'api_key', 'token', 'secret', 'password', 'bearer'];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogs(value);
    } else {
      // Catch values that look like obvious secrets even if the key name is generic
      if (typeof value === 'string' && (value.startsWith('sk-') || value.startsWith('Bearer '))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

// ==========================================
// --- ENGINE UTILITIES (THE BRAIN) ---------
// ==========================================

function compileTemplate(templateString, context) {
  if (!templateString) return '';
  return templateString.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, path) => {
    const value = _.get(context, path.trim());
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

function topologicalSort(nodes = [], edges = []) {
  const inDegree = {};
  const adjList = {};
  const sorted = [];
  const nodeIds = new Set(nodes.map(n => n.id));
  
  nodes.forEach(node => {
    inDegree[node.id] = 0;
    adjList[node.id] = [];
  });
  
  edges.forEach(edge => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
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
  
  if (sorted.length !== nodes.length) {
    throw new Error("Cycle detected or disconnected nodes present in workflow graph!");
  }
  return sorted;
}

// ==========================================
// --- BACKGROUND WORKER (CONSUMER) ---------
// ==========================================

export const worker = new Worker('workflow-queue', async (job) => {
  const { workflow, payload } = job.data;
  console.log(`\n👷 [WORKER] Picked up Job ${job.id} for workflow: ${workflow.id}`);
  
  const nodes = workflow?.graph?.nodes || [];
  const edges = workflow?.graph?.edges || [];

  if (nodes.length === 0) {
    console.log(`⚠️ [WORKER] Workflow ${workflow.id} has no nodes to execute.`);
    return { status: "SKIPPED", reason: "Empty graph" };
  }

  const executionOrder = topologicalSort(nodes, edges);
  
  // THE NEW BUCKET: Shared data context for templating variables
  const executionContext = {
    trigger: payload // Automatically map the incoming webhook data to {{trigger}}
  };
  
  const stepResults = {}; // Used for database logging
  let finalResult = null;

  for (const nodeId of executionOrder) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;

    // Grab the user-defined output key, fallback to the node ID
    const outputKey = node.data?.outputKey || node.id;
    
    // 1. TRIGGER NODE
    if (node.type === 'trigger') {
      executionContext[outputKey] = payload; // Usually {{trigger}}
      stepResults[node.id] = payload; 
      finalResult = payload;
      continue;
    }
    
    // 2. FILTER NODE
    if (node.type === 'filter') {
      const filterKey = node.data?.filterKey || '';
      const filterOperator = node.data?.filterOperator || '==';
      const filterValue = node.data?.filterValue || '';
      
      const actualValue = _.get(executionContext, filterKey.trim());

      let passed = false;
      const strActual = String(actualValue);
      const strTarget = String(filterValue);
      if (filterOperator === '==') passed = (strActual === strTarget);
      if (filterOperator === '!=') passed = (strActual !== strTarget);

      if (!passed) {
        console.log(`🛑 [WORKER] Filter condition failed at ${node.id}. Halting.`);
        return { haltedAt: node.id, reason: "Filter failed" }; 
      }
      
      executionContext[outputKey] = { passed: true };
      stepResults[node.id] = { passed: true }; 
      continue;
    }
    
    // 3. AI NODE EXECUTION
    if (node.type === 'ai') {
      const outputKey = node.data?.outputKey || 'ai_result';

      // Read prompt directly from right sidebar format, with fallback to legacy config
      const rawPrompt = node.data?.prompt || node.data?.config?.userPrompt || '';
      const compiledPrompt = compileTemplate(rawPrompt, executionContext);

      const provider = (node.data?.provider || 'gemini').toLowerCase();
      const modelId = node.data?.modelId || 'gemini-3.8-flash';
      const baseUrl = node.data?.baseUrl;

      console.log(`✨ [WORKER] Executing AI (${provider}: ${modelId})`);

      try {
        const savedCred = workflow.userId
          ? await prisma.credential.findUnique({
              where: { userId_provider: { userId: workflow.userId, provider: provider } },
            })
          : null;

        let apiKey = null;
        if (savedCred?.accessToken) {
          try {
            apiKey = JSON.parse(decrypt(savedCred.accessToken)).apiKey;
          } catch {
            apiKey = decrypt(savedCred.accessToken);
          }
        }

        if (!apiKey) {
          throw new Error(`Missing API Key for ${provider}. Please save it in the Configure Node panel.`);
        }

        const aiResult = await executeAI({
          provider,
          modelId,
          baseUrl,
          prompt: compiledPrompt,
          apiKey,
        });

        executionContext[outputKey] = aiResult;
        stepResults[node.id] = aiResult;
        finalResult = aiResult;
        console.log(`✅ [WORKER] AI Node succeeded -> context.${outputKey}`);
      } catch (error) {
        console.error(`❌ [WORKER] AI Node Failed:`, error.message);
        executionContext[outputKey] = { error: error.message };
        stepResults[node.id] = { error: error.message };
      }
      continue;
    }

    // 4. KNOWLEDGE BASE NODE
    if (node.type === 'knowledge_base') {
      // Upgraded to use executionContext
      const compiledQuery = compileTemplate(node.data?.query || '', executionContext);
      const queryText = compiledQuery || (typeof payload === 'string' ? payload : JSON.stringify(payload));
      
      const databaseId = node.data?.databaseId || 'mock_db';
      const maxChunks = node.data?.maxChunks || 2;
      const provider = node.data?.provider || 'openai'; 
      const baseUrl = node.data?.baseUrl;
      
      console.log(`📚 [WORKER] Querying Knowledge Base -> ${databaseId}`);
      
      try {
        const savedCred = workflow.userId ? await prisma.credential.findUnique({
          where: { userId_provider: { userId: workflow.userId, provider: provider } }
        }) : null;

        let apiKey = null;
        if (savedCred?.accessToken) {
          try { apiKey = JSON.parse(decrypt(savedCred.accessToken)).apiKey; } 
          catch { apiKey = decrypt(savedCred.accessToken); }
        }

        const ragResult = await queryKnowledgeBase({ queryText, maxChunks, provider, apiKey, baseUrl });
        
        executionContext[outputKey] = ragResult;
        stepResults[node.id] = ragResult;
        finalResult = ragResult;
        console.log(`✅ [WORKER] RAG retrieval successful!`);
      } catch (error) {
        console.error(`❌ [WORKER] RAG Node Failed:`, error.message);
        stepResults[node.id] = { error: error.message };
      }
      continue;
    }

    // 5. THIRD-PARTY INTEGRATION NODE
    if (node.type === 'integration') {
      const provider = node.data?.provider; 
      console.log(`🔌 [WORKER] Running Integration -> ${provider}`);

      const integration = getIntegration(provider);
      if (!integration) throw new Error(`Unsupported integration provider: ${provider}`);

      const savedCred = workflow.userId ? await prisma.credential.findUnique({
        where: { userId_provider: { userId: workflow.userId, provider: provider } }
      }) : null;

      let credentialData = null;
      if (savedCred?.accessToken) {
        try {
          const decrypted = decrypt(savedCred.accessToken);
          try { credentialData = JSON.parse(decrypted); } catch { credentialData = { accessToken: decrypted }; }
        } catch { credentialData = { accessToken: savedCred.accessToken }; }
      }

      // Compile ALL inputs in the node configuration against the current context bucket
      const compiledNodeData = {};
      for (const [key, val] of Object.entries(node.data || {})) {
        compiledNodeData[key] = typeof val === 'string' ? compileTemplate(val, executionContext) : val;
      }

      try {
        // Extract action and pass arguments exactly as registry.js expects
        const action = node.data?.action || 'default_action';
        
        const result = await integration.execute(
          action, 
          compiledNodeData, 
          credentialData
        );
        
        executionContext[outputKey] = result;
        stepResults[node.id] = result;
        finalResult = result;
        console.log(`✅ [WORKER] Integration ${provider} executed successfully.`);
      } catch (err) {
        console.error(`❌ [WORKER] Integration ${provider} Failed:`, err.message);
        stepResults[node.id] = { error: err.message };
      }
      continue;
    }

    // 6. ACTION NODE
    if (node.type === 'action') {
      const method = node.data?.method || 'POST';
      const rawUrl = node.data?.url || node.data?.label || '';
      
      const compiledUrl = compileTemplate(rawUrl, executionContext);
      
      // NEW: Await the async DNS resolution security check
      await assertPublicUrl(compiledUrl);
      
      console.log(`🚀 [WORKER] Executing Custom Action -> ${method} ${compiledUrl}`);
      
      try {
        let fetchHeaders = { 'Content-Type': 'application/json' };
        if (node.data?.headers) {
          try {
            const compiledHeadersStr = compileTemplate(node.data.headers, executionContext);
            const userHeaders = JSON.parse(compiledHeadersStr);
            fetchHeaders = { ...fetchHeaders, ...userHeaders };
          } catch (headerErr) {
            console.warn(`⚠️ [WORKER] Invalid JSON in headers for Node ${node.id}. Using defaults.`);
          }
        }

        let fetchBody = undefined;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          if (node.data?.body) {
            fetchBody = compileTemplate(node.data.body, executionContext);
          } else {
            fetchBody = JSON.stringify({ data: finalResult || payload });
          }
        }

        const actionResponse = await fetch(compiledUrl, { method, headers: fetchHeaders, body: fetchBody });
        const rawText = await actionResponse.text();
        
        let actionData;
        try { actionData = JSON.parse(rawText); } 
        catch { actionData = { status: actionResponse.status, text: rawText ? rawText.substring(0, 500) : 'OK' }; }
        
        executionContext[outputKey] = actionData;
        stepResults[node.id] = actionData;
        finalResult = actionData;
        console.log(`✅ [WORKER] Action Node completed.`);
      } catch (error) {
        console.error(`❌ [WORKER] Action Node Failed:`, error.message);
        stepResults[node.id] = { error: error.message };
      }
      continue;
    }
  }

  // Persist execution result to PostgreSQL
  try {
    await prisma.execution.create({
      data: {
        workflowId: workflow.id,
        status: "COMPLETED",
        triggerData: payload,
        // CHANGED: Wrap results in sanitizeLogs()
        resultData: sanitizeLogs(finalResult || stepResults),
        logs: sanitizeLogs(stepResults),
        completedAt: new Date()
      }
    });
    console.log(`💾 [WORKER] Sanitized execution record persisted to Supabase.`);
  } catch (execErr) {
    console.error(`⚠️ [WORKER] Failed to persist execution record:`, execErr.message);
  }

  return finalResult || stepResults;
}, { connection: queueConnection });

worker.on('completed', (job) => console.log(`✅ [WORKER] Job ${job.id} completed successfully!`));
worker.on('failed', (job, error) => console.error(`❌ [WORKER] Job ${job.id} failed:`, error));