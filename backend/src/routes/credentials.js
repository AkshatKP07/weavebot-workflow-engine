// backend/src/routes/credentials.js
import express from 'express';
import { prisma } from '../config/db.js';
// Adjust path to your crypto.js if necessary (e.g., '../../utils/crypto.js')
import { encrypt } from '../utils/crypto.js';

const router = express.Router();

const syncUser = async (req, res, next) => {
  try {
    await prisma.user.upsert({
      where: { id: req.auth.userId },
      update: {},
      create: { id: req.auth.userId, email: `${req.auth.userId}@weavebot.app` }
    });
    next();
  } catch (error) {
    console.error('❌ [AUTH] User profile sync failed:', error.message);
    res.status(500).json({ error: 'Failed to sync user profile' });
  }
};

router.use(syncUser);

// GET /api/credentials - Fetch connected integrations
router.get('/credentials', async (req, res) => {
  try {
    const credentials = await prisma.credential.findMany({
      where: { userId: req.auth.userId },
      select: { id: true, provider: true, createdAt: true }
    });
    res.json(credentials);
  } catch (error) {
    console.error('❌ [VAULT] Fetch failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// POST /api/credentials - Encrypt and save keys to the vault
router.post('/credentials', async (req, res) => {
  try {
    const { provider, data, secretData } = req.body;
    
    // 1. Extract the payload sent by the frontend's apiClient
    const rawPayload = data || secretData || req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Missing provider identifier' });
    }

    // 2. Stringify the object so your crypto.js can process it
    const stringifiedPayload = JSON.stringify(rawPayload);

    // 3. Encrypt using your existing GCM implementation
    const encryptedToken = encrypt(stringifiedPayload);

    // 4. Save to the database
    const credential = await prisma.credential.upsert({
      where: {
        userId_provider: {
          userId: req.auth.userId,
          provider: provider
        }
      },
      update: {
        accessToken: encryptedToken,
        refreshToken: null
      },
      create: {
        provider,
        accessToken: encryptedToken,
        refreshToken: null,
        userId: req.auth.userId
      }
    });

    console.log(`🔒 [VAULT] Encrypted credential saved for provider: "${provider}"`);
    res.json({ success: true, id: credential.id });
  } catch (error) {
    console.error('❌ [VAULT] Save failed:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
});

export default router;