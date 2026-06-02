# Adaptive RAG Powered E-commerce Product Assistant

A complete, production-ready, domain-specific **Adaptive RAG (Retrieval-Augmented Generation) Chatbot** designed from scratch to serve as an E-commerce Product Assistant. It answers complex user questions regarding specifications, manuals, FAQs, warranties, and return/shipping policies using dynamic context retrieval.

---

## ⚡ Key Architectural Features

1. **Adaptive RAG Core Pipeline**:
   - **Query Classifier**: Categorizes queries using Groq into 6 distinct intent namespaces (`Product Lookup`, `Product Comparison`, `Recommendation`, `Warranty Query`, `Return Policy Query`, `FAQ Query`).
   - **Query Rewriter**: Translates shorthand or vague queries to search-dense keyword terms.
   - **Dynamic Retrieval**: Search queries target specific collections and dynamically alter Top K retrieve variables based on classification (e.g. comparison queries fetch `Top K = 8`, lookups fetch `Top K = 3`).
   - **Adaptive Context Selection**: Filters out low-value chunks (similarity score < 0.35) and strips duplicate overlaps.
   - **Failsafe Confidence Scorer**: Yields a 0% - 100% groundedness confidence level.

2. **Ingestion & Local Vector Layer**:
   - Parses **PDF, DOCX, TXT, CSV, and Markdown** files completely.
   - Utilizes `@xenova/transformers` locally inside Node.js to load the compact `Xenova/all-MiniLM-L6-v2` model. It generates **384-dimensional vector embeddings fully offline and keyless** (100% free and fast).
   - Feeds a reusable **ChromaDB Service Layer** across 6 custom collections.

3. **Hybrid Feedback Database**:
   - Stores pre-verified Q&A profiles, their semantic question embedding vector, and descriptive keyword tags.
   - Implements a **3-tier search** incorporating:
     1. Question Cosine Similarity
     2. Tag overlap matches
     3. **Hybrid Ranking** (`0.7 * VectorSimilarity + 0.3 * TagOverlap`)
   - Returns standard answers, synthesizes multiple close records automatically, or triggers the fallback query signature: *"I don't have that information in the database."*

4. **Auditing & LangSmith Tracing**:
   - Traces the complete nested run tree (User input -> Classification -> Rewriting -> Dynamic search -> Generation -> Evaluation) to your **LangSmith Dashboard**.
   - Integrates an **Evaluation Framework** logging 8 critical metrics (Precision@K, Recall@K, MRR, Context Relevance, Faithfulness, Answer Relevance, Groundedness, Correctness) to power historical dashboard analytics.

5. **Sample Dataset Generator**:
   - Programmatically creates **52 high-quality data files** containing detailed laptop models (Dell XPS, HP Spectre, ThinkPad, MacBook Pro, ROG Zephyrus, Samsung curved screens), warranties, return rules, and charging FAQs to easily populate your vector space in a single click.

---

## 🛠️ Tech Stack & Ports

- **Frontend**: React SPA served via Vite (`http://localhost:5173`)
- **Backend API**: Node.js + Express + TypeScript (`http://localhost:5000`)
- **Vector DB**: ChromaDB HTTP Server (`http://localhost:8000`)
- **LLM Engine**: Groq SDK (`llama-3.1-8b-instant`)
- **Tracing**: LangSmith SDK Client

---

## 🚀 Quick Start Deployments

### Method A: One-Click Docker Compose (Recommended)
This spins up the entire vector store, backend compiler, and frontend container in absolute coordination with a single command.

1. Create a `.env` file in the project root:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   LANGSMITH_API_KEY=your_langsmith_key_here
   LANGSMITH_PROJECT=adaptive-rag-ecommerce
   LANGSMITH_ENDPOINT=https://api.smith.langchain.com
   ```
2. Launch the docker multi-containers:
   ```bash
   docker-compose up -d --build
   ```
3. Visit the frontend in your browser: `http://localhost` (mapped to port 80).

---

### Method B: Local Development Server

#### 1. Setup Backend environment
- Navigate into `backend` and create a `.env` file from the example:
  ```bash
  cd backend
  cp .env.example .env
  ```
- Fill in your API Credentials:
  ```env
  GROQ_API_KEY=your_groq_key
  # Optional LangSmith tracing:
  LANGSMITH_API_KEY=your_langsmith_key
  LANGSMITH_PROJECT=adaptive-rag-ecommerce
  LANGSMITH_ENDPOINT=https://api.smith.langchain.com
  CHROMADB_HOST=localhost
  CHROMADB_PORT=8000
  PORT=5000
  NODE_ENV=development
  ```

#### 2. Install dependencies & run generator
- Run in root directory:
  ```bash
  # Installs root, backend, and frontend packages
  npm run install:all

  # Generate the 52+ document test dataset
  npm run generate:dataset
  ```

#### 3. Run Dev Server
Launch backend and frontend hot-reloading dev servers concurrently:
```bash
npm run dev
```
- Open `http://localhost:5173` to interact with the visual client!
- Go to the **Ingest Engine** tab and click **Automate 50+ Ingestion** to index the 52 sample documents inside ChromaDB!

---

## 📁 Folder Structure Overview
```
adaptive-rag-ecommerce-assistant/
│
├── data/                       # Local database storage
│   ├── db.json                 # Feedback & Evaluation JSON DB
│   └── sample_dataset/         # 52 generated Q&A files
│
├── backend/
│   ├── src/
│   │   ├── routes/             # Ingest, Chat, Feedback, Tagging, Evaluation
│   │   ├── controllers/        # Express handlers
│   │   ├── services/           
│   │   │   ├── chromadb.service.ts
│   │   │   ├── embedding.service.ts
│   │   │   ├── groq.service.ts
│   │   │   └── db.service.ts   # JSON db helper
│   │   ├── rag/
│   │   │   └── adaptive/       # Classification, Rewriting, Retrieval, Context, Confidence
│   │   ├── tracing/            # LangSmith config, evaluation suite
│   │   └── utils/              # TextSplitter, Logger
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/              # Dashboard, Ingest, Chatbot, Metrics, Feedback Search
│   │   ├── App.tsx             # SPA Chassis shell
│   │   ├── index.css           # Curated CSS styling system
│   │   └── main.tsx
│   ├── Dockerfile
│   └── nginx.conf              # Reverse proxy configuration
│
├── scripts/
│   ├── generate_dataset.ts     # Dataset generator script
│   └── test_pipeline.ts        # Automated integration testing
│
├── docker-compose.yml          # Unified multi-container stack
├── API.md                      # API endpoints documentation
└── README.md
```
