// backend/ai/rag.js

// A simple in-memory store for our mock vector database.
// In a production app, this would be Pinecone, Qdrant, or Postgres with pgvector.
const mockVectorDB = [];

// 1. Utility: Calculate Cosine Similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// backend/ai/rag.js (Update this function)
async function getGeminiEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  // Changed text-embedding-004 to gemini-embedding-001
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] }
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  return data.embedding.values;
}

// 3. Seed the database with some dummy knowledge (Run once on startup)
export async function seedMockDatabase() {
  if (mockVectorDB.length > 0) return; // Already seeded

  console.log("🌱 [RAG] Seeding mock vector database...");
  const documents = [
    { id: "doc1", text: "Company Policy: All employees get 20 days of paid time off per year." },
    { id: "doc2", text: "Engineering: The backend API rate limit is 100 requests per minute per user." },
    { id: "doc3", text: "HR: The CEO of the company is Jane Doe. The CTO is John Smith." }
  ];

  for (const doc of documents) {
    try {
      const embedding = await getGeminiEmbedding(doc.text);
      mockVectorDB.push({ ...doc, embedding });
    } catch (error) {
      console.error("Failed to seed doc:", doc.id, error.message);
    }
  }
  console.log(`✅ [RAG] Seeded ${mockVectorDB.length} documents.`);
}

// 4. Query the Knowledge Base (The actual RAG retrieval)
export async function queryKnowledgeBase(queryText, maxChunks = 2) {
  console.log(`🔍 [RAG] Searching vector DB for: "${queryText}"`);
  
  // Convert the user's query into an embedding
  const queryVector = await getGeminiEmbedding(queryText);

  // Compare query against all documents in the DB
  const results = mockVectorDB.map(doc => {
    const score = cosineSimilarity(queryVector, doc.embedding);
    return { text: doc.text, score };
  });

  // Sort by highest similarity score
  results.sort((a, b) => b.score - a.score);

  // Return the top N chunks
  const topResults = results.slice(0, maxChunks);
  
  // Combine the text of the top results into a single context block
  const retrievedContext = topResults.map(r => r.text).join('\n\n');
  
  return { retrievedContext, matches: topResults };
}