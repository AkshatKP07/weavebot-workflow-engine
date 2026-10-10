// backend/src/ai/rag.js
import { prisma } from '../config/db.js';

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
        dimensions: 768 // Forces OpenAI-compatible APIs to output exactly 768 dimensions
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Universal embedding failed');
    return data.data[0].embedding;
  }

  throw new Error(`Unsupported embedding provider: ${provider}`);
}

// 2. Query the Knowledge Base (Now receives dynamic credentials)
export async function queryKnowledgeBase({ queryText, maxChunks = 2, provider = 'gemini', apiKey, baseUrl }) {
  console.log(`🔍 [RAG] Searching Supabase for: "${queryText.substring(0, 30)}..."`);
  
  const queryVector = await generateEmbedding({ text: queryText, provider, apiKey, baseUrl });
  const vectorString = `[${queryVector.join(',')}]`;

  // Note: For production multi-tenancy, add a `WHERE "userId" = ${userId}` clause here
  const results = await prisma.$queryRaw`
    SELECT content, 1 - (embedding <=> ${vectorString}::vector) as score
    FROM "Document"
    ORDER BY embedding <=> ${vectorString}::vector ASC
    LIMIT ${maxChunks};
  `;

  const retrievedContext = results.map(r => r.content).join('\n\n');
  return { retrievedContext, matches: results };
}

// 3. Seed the database (Gracefully fails if run in CI/CD without a test key)
export async function seedMockDatabase(testApiKey, provider = 'gemini') {
  console.log("🌱 [RAG] Seeding Supabase pgvector database...");
  if (!testApiKey) {
    console.warn("⚠️ [RAG] Skipping seed: No developer API key provided for embeddings.");
    return;
  }

  const documents = [
    { id: "doc1", text: "Company Policy: All employees get 20 days of paid time off per year." },
    { id: "doc2", text: "Engineering: The backend API rate limit is 100 requests per minute per user." },
    { id: "doc3", text: "HR: The CEO of the company is Jane Doe. The CTO is John Smith." }
  ];

  for (const doc of documents) {
    try {
      const exists = await prisma.document.findUnique({ where: { id: doc.id } });
      if (exists) continue;

      const embedding = await generateEmbedding({ text: doc.text, provider, apiKey: testApiKey });
      const vectorString = `[${embedding.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "Document" (id, content, embedding)
        VALUES (${doc.id}, ${doc.text}, ${vectorString}::vector)
      `;
    } catch (error) {
      console.error("Failed to seed doc:", doc.id, error.message);
    }
  }
  console.log(`✅ [RAG] Supabase vector database ready.`);
}

// 4. Insert vectors from the frontend UI
export async function insertDocumentVectors(documents) {
  for (const doc of documents) {
    // Convert the raw array into a formatted pgvector string
    const vectorString = `[${doc.embedding.join(',')}]`;
    
    await prisma.$executeRaw`
      INSERT INTO "Document" ("userId", "databaseId", "title", "content", "embedding", "createdAt")
      VALUES (
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