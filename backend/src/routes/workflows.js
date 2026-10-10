import express from 'express';
import { prisma } from '../config/db.js';
import { workflowQueue } from '../config/queue.js';

const router = express.Router();

// Middleware: Auto-sync Clerk user to Prisma database
const syncUser = async (req, res, next) => {
  try {
    await prisma.user.upsert({
      where: { id: req.auth.userId },
      update: {},
      create: { 
        id: req.auth.userId, 
        email: `${req.auth.userId}@weavebot.app` 
      }
    });
    next();
  } catch (error) {
    console.error("User Sync Error:", error);
    res.status(500).json({ error: 'Failed to sync user profile' });
  }
};

router.use(syncUser);

// GET /api/workflows - Fetch only the logged-in user's workflows
router.get('/', async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId: req.auth.userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// POST /api/workflows - Save (Create or Update) a workflow
router.post('/', async (req, res) => {
  try {
    const { id, name, description, graph, nodes, edges } = req.body;
    const userId = req.auth.userId;

    const finalGraph = graph || { nodes: nodes || [], edges: edges || [] };

    const workflow = await prisma.workflow.upsert({
      where: { id: id || 'new_placeholder_id' },
      update: {
        name: name || 'Untitled Workflow',
        description,
        graph: finalGraph
      },
      create: {
        id: id || undefined,
        name: name || 'Untitled Workflow',
        description,
        graph: finalGraph,
        user: {
          connect: { id: userId }
        }
      }
    });
    
    res.json(workflow);
  } catch (error) {
    console.error('Save Error:', error);
    res.status(500).json({ error: 'Failed to save workflow' });
  }
});

// POST /api/workflows/bulk-deploy - Bulk deploy multiple workflows instantly
router.post('/bulk-deploy', async (req, res) => {
  try {
    const { workflowIds } = req.body;
    
    if (!workflowIds || !Array.isArray(workflowIds)) {
      return res.status(400).json({ error: 'Invalid payload. Expected an array of workflowIds.' });
    }

    // Update all selected workflows to ACTIVE status securely
    await prisma.workflow.updateMany({
      where: { 
        id: { in: workflowIds },
        userId: req.auth.userId
      },
      
      data: { isActive: true } 
    });

    console.log(`🚀 [API] Bulk deployed ${workflowIds.length} workflows.`);
    res.json({ success: true, message: `Successfully deployed ${workflowIds.length} workflows.` });
  } catch (error) {
    console.error('❌ [API] Bulk deploy error:', error);
    res.status(500).json({ error: 'Failed to deploy workflows' });
  }
});

// POST /api/workflows/bulk-undeploy - Stop active workflows
router.post('/bulk-undeploy', async (req, res) => {
  try {
    const { workflowIds } = req.body;
    
    if (!workflowIds || !Array.isArray(workflowIds)) {
      return res.status(400).json({ error: 'Invalid payload.' });
    }

    // Flip isActive back to false
    await prisma.workflow.updateMany({
      where: { 
        id: { in: workflowIds },
        userId: req.auth.userId
      },
      data: { isActive: false } 
    });

    console.log(`🛑 [API] Bulk undeployed ${workflowIds.length} workflows.`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [API] Bulk undeploy error:', error);
    res.status(500).json({ error: 'Failed to undeploy workflows' });
  }
});

// GET /api/workflows/:id/executions - Fetch execution history
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const workflow = await prisma.workflow.findUnique({
      where: { id, userId }
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    const executions = await prisma.execution.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: 'desc' }, 
      take: 20
    });

    res.json(executions);
  } catch (error) {
    console.error('Failed to fetch executions:', error);
    res.status(500).json({ error: 'Failed to fetch execution history' });
  }
});

// GET /api/workflows/:id - Fetch a single workflow
router.get('/:id', async (req, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id, userId: req.auth.userId }
    });
    
    if (!workflow) return res.status(404).json({ error: 'Not found' });
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// DELETE /api/workflows/:id - Delete a workflow
router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.workflow.deleteMany({
      where: { 
        id: req.params.id,
        userId: req.auth.userId 
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }
    
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// POST /api/workflows/:id/test - Trigger a test execution
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { payload } = req.body;

    const workflow = await prisma.workflow.findUnique({
      where: { id, userId: req.auth.userId }
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const job = await workflowQueue.add('test-run', { workflow, payload });
    
    res.json({ success: true, jobId: job.id, message: "Execution queued" });
  } catch (error) {
    console.error("Test Run Error:", error);
    res.status(500).json({ error: 'Failed to queue test run' });
  }
});

export default router;