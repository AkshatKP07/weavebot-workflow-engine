# ⚡️ WeaveBot: Enterprise AI Workflow Orchestrator

WeaveBot is a full-stack, event-driven workflow automation engine (similar to Zapier or Make.com) built to execute complex, multi-step integrations and AI tasks asynchronously. 

It features a drag-and-drop React Flow canvas, a topological sort execution engine, and a BullMQ background worker system designed to handle webhooks, secure third-party API credentials, and query vector databases (RAG) at scale.

## 🏗 Architecture & Tech Stack
* **Frontend:** React, React Flow, Tailwind CSS, Zustand
* **Backend:** Node.js, Express.js
* **Asynchronous Queue:** BullMQ, Redis
* **Database & ORM:** SQLite, Prisma, `@prisma/adapter-libsql`
* **AI & RAG Engine:** Google Gemini 1.5, Vector Embeddings
* **Security:** Native Node.js `crypto` (AES-256-GCM) for credential vaulting

## ✨ Core Features
* **Visual Graph Execution:** Drag-and-drop canvas that compiles nodes and edges into a strict topological execution order.
* **Event-Driven Background Workers:** Webhooks are instantly caught and offloaded to a Redis-backed BullMQ queue, ensuring zero dropped requests during heavy AI generation.
* **Dynamic Payload Injection:** Custom template compiler uses Lodash and Handlebars syntax (`{{forwardedData.message}}`) to inject live webhook payloads deeply into AI prompts and API headers.
* **Multi-Model AI Router & RAG:** Built-in semantic search engine that queries a vector knowledge base and dynamically injects retrieved context into prompts.
* **Encrypted Vault:** Third-party tokens (Discord, Notion, etc.) are encrypted via AES-256-GCM before database storage and decrypted at runtime.
* **Template Marketplace:** Built-in sanitization pipeline that strips private user credentials from graphs, allowing workflows to be published and cloned as public templates.

## 🚀 Local Setup & Installation

**1. Clone the repository and install dependencies**
```bash
git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
cd node-workflow-engine
cd frontend && npm install
cd ../backend && npm install
