import express from 'express';
import { prisma } from '../config/db.js';
import { decrypt } from '../utils/crypto.js';
import { generateEmbedding, insertDocumentVectors } from '../ai/rag.js';

const router = express.Router();

// Helper: Split long texts into overlapping chunks
function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

// POST /api/knowledge/documents - Add custom text/document
router.post('/documents', async (req, res) => {
  try {
    const { title, content, databaseId = 'default' } = req.body;
    const userId = req.auth.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Document content is required.' });
    }

    // 1. Fetch user's embedding API key from vault
    const credential = await prisma.credential.findUnique({
      where: { userId_provider: { userId, provider: 'gemini' } }
    });

    if (!credential) {
      return res.status(400).json({ error: 'Please save a Gemini API key in the vault first.' });
    }

    const parsedCred = JSON.parse(decrypt(credential.accessToken));
    const apiKey = parsedCred.apiKey || parsedCred;

    // 2. Chunk text to ensure search accuracy
    const chunks = chunkText(content);
    const recordsToInsert = [];

    // 3. Generate embeddings for each chunk
    for (const [index, chunk] of chunks.entries()) {
      const vector = await generateEmbedding({ text: chunk, apiKey });
      recordsToInsert.push({
        userId,
        databaseId,
        title: `${title || 'Untitled'} (Part ${index + 1})`,
        content: chunk,
        embedding: vector
      });
    }

    // 4. Save vectors to Supabase pgvector
    await insertDocumentVectors(recordsToInsert);

    res.json({
      success: true,
      chunksCreated: recordsToInsert.length,
      message: `Successfully indexed ${recordsToInsert.length} knowledge chunks.`
    });
  } catch (error) {
    console.error('❌ [RAG INGESTION ERROR]:', error);
    res.status(500).json({ error: error.message || 'Failed to index document.' });
  }
});

export default router;