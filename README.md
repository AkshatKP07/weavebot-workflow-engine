# 🕸️ WeaveBot:Workflow Engine

**Live Demo:** [https://weavebot-workflow-engine.vercel.app](https://weavebot-workflow-engine.vercel.app)

WeaveBot is a production-grade, visual workflow automation engine. It allows users to build, connect, and execute complex AI and API workflows using a node-based drag-and-drop canvas. 

Built with a strict **Bring Your Own Key (BYOK)** architecture and **Multi-Tenant RAG**, this engine ensures that user credentials and vector databases are securely isolated and encrypted.

## ✨ Core Features

* 🔀 **Visual Workflow Builder:** A seamless, drag-and-drop canvas powered by React Flow for chaining triggers, AI models, Knowledge Bases, and HTTP requests.
* 🔐 **Bring Your Own Key (BYOK):** Users provide their own AI API keys (OpenAI, Gemini, etc.), which are securely encrypted using AES-256 before being stored in the database.
* 🧠 **Multi-Tenant RAG (pgvector):** Strict multi-tenant isolation for document embeddings. Users can upload documents to custom "Database IDs" (vaults), and the background worker ensures AI searches are restricted by `userId` and `databaseId`.
* 🛡️ **Enterprise-Grade Security:**
  * **SSRF Protection:** Custom middleware blocks Server-Side Request Forgery by denying internal IPs, cloud metadata endpoints, and DNS rebinding attacks on HTTP Action nodes.
  * **SSTI Protection:** Secure Handlebars-style template compilation that sanitizes inputs and prevents Remote Code Execution (RCE).
  * **Auth:** Fully integrated Clerk authentication safeguarding both frontend routes and backend APIs.
* ⚡ **Asynchronous Execution:** Background job processing powered by BullMQ and Upstash Redis ensures workflows execute reliably without blocking the main event loop.

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* React Flow (Node Canvas)
* Tailwind CSS
* Hosted on **Vercel**

**Backend:**
* Node.js & Express
* Prisma ORM
* BullMQ (Job Queues)
* Hosted on **Render**

**Infrastructure / Database:**
* **Supabase:** PostgreSQL with `pgvector` for vector similarity search
* **Upstash:** Serverless Redis for BullMQ queues
* **Clerk:** User Authentication

## 🚀 How It Works (The Execution Pipeline)

1. **Trigger:** A webhook listener catches custom JSON payloads.
2. **Queueing:** The API validates the request, encrypts sensitive data, and pushes the job to the Redis queue.
3. **Topological Sort:** The background worker resolves the node dependency graph and executes nodes in the correct order.
4. **Knowledge Retrieval (RAG):** The engine dynamically embeds the user's query and performs a strict multi-tenant vector search in Supabase.
5. **AI Reasoning:** The retrieved context and dynamic prompt variables are compiled and sent to the LLM (using the user's decrypted API key).
6. **Action:** The AI's response is packaged and fired out via a securely validated external HTTP POST request.

## 💻 Local Development

To run this project locally, you will need keys for Supabase, Upstash Redis, and Clerk.

1. Clone the repository:
   ```bash
   git clone [https://github.com/AkshatKP07/weavebot-workflow-engine.git](https://github.com/AkshatKP07/weavebot-workflow-engine.git)
