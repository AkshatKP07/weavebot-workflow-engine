import { prisma } from '../config/db.js';
import { randomUUID } from 'crypto';


// 1. Universal Embedding Router (BYOK)
export async function generateEmbedding({ text, provider = 'gemini', apiKey, baseUrl }) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(`Embedding failed: No API key found for provider "${provider}". Please save it in the Knowledge Base node settings.`);
  }

  const cleanKey = apiKey.trim();

  // A. GOOGLE GEMINI (Secure Header Implementation)
  if (provider === 'gemini') {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: { parts: [{ text }] },
        outputDimensionality: 768
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini embedding failed');
    return data.embedding.values;
  }

  // B. UNIVERSAL (OpenAI, DeepSeek, Local)
  if (provider === 'universal') {
    const rawBaseUrl = baseUrl?.trim() || 'https://api.openai.com/v1';
    const endpoint = rawBaseUrl.replace(/\/+$/, '') + '/embeddings';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small", 
        dimensions: 768 
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Universal embedding failed');
    return data.data[0].embedding;
  }

  throw new Error(`Unsupported embedding provider: ${provider}`);
}

// 2. Query the Knowledge Base (Now receives dynamic credentials and Tenant ID)
export async function queryKnowledgeBase({ queryText, maxChunks = 2, provider = 'gemini', apiKey, baseUrl, userId, databaseId }) {
  console.log(`🔍 [RAG] Searching Supabase for: "${queryText.substring(0, 30)}..."`);
  
  const queryVector = await generateEmbedding({ text: queryText, provider, apiKey, baseUrl });
  const vectorString = `[${queryVector.join(',')}]`;

  // STRICT MULTI-TENANCY: Only search documents belonging to this user and this specific database
  const results = await prisma.$queryRaw`
    SELECT content, 1 - (embedding <=> ${vectorString}::vector) as score
    FROM "Document"
    WHERE "userId" = ${userId} AND "databaseId" = ${databaseId}
    ORDER BY embedding <=> ${vectorString}::vector ASC
    LIMIT ${maxChunks};
  `;

  const retrievedContext = results.map(r => r.content).join('\n\n');
  return { retrievedContext, matches: results };
}

// 3. Insert vectors from the frontend UI
// 3. Insert vectors from the frontend UI
export async function insertDocumentVectors(documents) {
  for (const doc of documents) {
    const vectorString = `[${doc.embedding.join(',')}]`;
    const newId = randomUUID(); // Generate the UUID manually for the raw query
    
    await prisma.$executeRaw`
      INSERT INTO "Document" ("id", "userId", "databaseId", "title", "content", "embedding", "createdAt")
      VALUES (
        ${newId},
        ${doc.userId},
        ${doc.databaseId},
        ${doc.title},
        ${doc.content},
        ${vectorString}::vector,
        NOW()
      );
    `;
  }
}