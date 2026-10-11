import express from 'express';
import { prisma } from '../config/db.js';
import { decrypt } from '../utils/crypto.js';
import { generateEmbedding, insertDocumentVectors } from '../ai/rag.js';

const router = express.Router();

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

router.post('/documents', async (req, res) => {
  try {
    const { title, content, databaseId = 'default', provider = 'gemini', baseUrl } = req.body;
    const userId = req.auth.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Document content is required.' });
    }

    const credential = await prisma.credential.findUnique({
      where: { userId_provider: { userId, provider } }
    });

    if (!credential) {
      return res.status(400).json({ error: `Please save your ${provider} API key in the credentials vault first.` });
    }

    const parsedCred = JSON.parse(decrypt(credential.accessToken));
    const apiKey = parsedCred.apiKey || parsedCred;

    const chunks = chunkText(content);
    const recordsToInsert = [];

    for (const [index, chunk] of chunks.entries()) {
      const vector = await generateEmbedding({ text: chunk, provider, apiKey, baseUrl });
      recordsToInsert.push({
        userId,
        databaseId,
        title: `${title || 'Untitled'} (Part ${index + 1})`,
        content: chunk,
        embedding: vector
      });
    }

    await insertDocumentVectors(recordsToInsert);

    res.json({
      success: true,
      chunksCreated: recordsToInsert.length,
      message: `Successfully indexed ${recordsToInsert.length} knowledge chunks using ${provider}.`
    });
  } catch (error) {
    console.error('❌ [RAG INGESTION ERROR]:', error);
    res.status(500).json({ error: error.message || 'Failed to index document.' });
  }
});

export default router;