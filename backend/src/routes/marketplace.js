import express from 'express';
import { prisma } from '../config/db.js';
import { sanitizeGraphForTemplate, instantiateTemplateGraph } from '../utils/templateEngine.js';

const router = express.Router();

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

// GET /api/templates?page=1&limit=20 - Fetch public templates with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      prisma.workflow.findMany({
        where: { isTemplate: true },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit
      }),
      prisma.workflow.count({
        where: { isTemplate: true }
      })
    ]);

    res.json({
      // Map through and check if the logged-in user owns the template
      data: templates.map(t => ({
        ...t,
        isOwner: t.userId === req.auth.userId
      })),
      meta: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Fetch Templates Error:", error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/templates/publish/:id - Safely publish a workflow
router.post('/publish/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const originalWorkflow = await prisma.workflow.findUnique({
      where: { id: id, userId: req.auth.userId }
    });

    if (!originalWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const safeGraph = sanitizeGraphForTemplate(originalWorkflow.graph);

    const template = await prisma.workflow.create({
      data: {
        name: `${originalWorkflow.name} (Template)`,
        description: originalWorkflow.description,
        graph: safeGraph,
        isTemplate: true,
        isActive: false,
        user: { connect: { id: req.auth.userId } }
      }
    });
    
    res.json({ success: true, template });
  } catch (error) {
    console.error("Publish Error:", error);
    res.status(500).json({ error: 'Failed to publish template' });
  }
});

// POST /api/templates/use/:id - Clone a template to the user's workspace
router.post('/use/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.workflow.findUnique({
      where: { id }
    });

    if (!template || !template.isTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const instantiatedGraph = instantiateTemplateGraph(template.graph);

    const clonedWorkflow = await prisma.workflow.create({
      data: {
        name: template.name.replace(' (Template)', '') + ' (Copy)',
        description: template.description,
        graph: instantiatedGraph,
        isActive: false,
        isTemplate: false,
        user: { connect: { id: req.auth.userId } }
      }
    });

    res.json(clonedWorkflow);
  } catch (error) {
    console.error("Clone Error:", error);
    res.status(500).json({ error: 'Failed to clone template' });
  }
});

// DELETE /api/templates/:id - Delete a published template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await prisma.workflow.deleteMany({
      where: { 
        id: id,
        userId: req.auth.userId,
        isTemplate: true
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    res.json({ success: true, message: 'Template deleted from marketplace' });
  } catch (error) {
    console.error("Delete Template Error:", error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;