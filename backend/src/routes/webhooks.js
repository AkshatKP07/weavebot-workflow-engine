// src/routes/webhooks.js
import express from 'express';
import { prisma } from '../config/db.js';
import { workflowQueue } from '../config/queue.js';

const router = express.Router();

// Webhook Catcher (Producer)
router.post('/:endpoint', async (req, res) => {
  const { endpoint } = req.params;
  const incomingData = req.body; 

  console.log(`\n⚡ [WEBHOOK] Triggered at: /webhook/${endpoint}`);

  try {
    // 1. Direct Lookup: Match by Workflow ID (used by the Test Run modal)
    let targetWorkflow = await prisma.workflow.findUnique({
      where: { id: endpoint }
    }).catch(() => null);

    // 2. Fallback Lookup: Match by custom slug or trigger node endpoint configuration
    if (!targetWorkflow) {
      const workflows = await prisma.workflow.findMany();
      
      for (const wf of workflows) {
        if (!wf || !wf.graph || !wf.graph.nodes) continue;
        
        const hasTrigger = wf.graph.nodes.some(n => {
          if (n.type !== 'trigger') return false;
          const label = n.data?.label || '';
          const nodeEndpoint = n.data?.endpoint || '';
          return (
            label === endpoint ||
            label === `/webhook/${endpoint}` ||
            nodeEndpoint === endpoint ||
            nodeEndpoint === `/webhook/${endpoint}` ||
            (endpoint === 'catch' && (label.includes('catch') || nodeEndpoint.includes('catch')))
          );
        });

        if (hasTrigger) {
          targetWorkflow = wf;
          break; 
        }
      }
    }
    
    if (!targetWorkflow) {
      return res.status(404).json({ error: "No matching workflow found" });
    }
    
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

export default router;