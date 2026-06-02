# API Documentation: Adaptive RAG E-commerce Product Assistant

This document outlines the API endpoints, requests, and response schemas exposed by the Node.js/Express backend server on `http://localhost:5000`.

---

## 📂 Document Management Endpoints

### 1. Upload File
- **Endpoint**: `POST /api/upload`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: Binary file (PDF, DOCX, CSV, TXT, MD)
- **Response**: `200 OK`
```json
{
  "message": "File uploaded successfully to temp storage.",
  "filePath": "C:\\D55\\GEN_AI_Training\\Module-6\\backend\\uploads\\upload_1717200000000_dell_xps.md",
  "originalName": "dell_xps_15_description.md",
  "size": 1054
}
```

### 2. Ingest Document
- **Endpoint**: `POST /api/ingest`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "filePath": "C:\\D55\\GEN_AI_Training\\Module-6\\backend\\uploads\\upload_1717200000000_dell_xps.md",
  "originalName": "dell_xps_15_description.md",
  "collection": "product_descriptions"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Document 'dell_xps_15_description.md' ingested successfully.",
  "document": {
    "id": "doc_1717200021345_abcde",
    "filename": "dell_xps_15_description.md",
    "product_name": "Dell XPS 15 Description",
    "category": "product_descriptions",
    "source_type": "md",
    "upload_date": "2026-06-01T10:04:47.123Z",
    "chunk_count": 2
  }
}
```

### 3. Bulk Ingest Sample Dataset
- **Endpoint**: `POST /api/documents/ingest-sample`
- **Description**: Scans the pre-generated `data/sample_dataset/` directory and auto-indexes all 52 files.
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Sample dataset ingestion run completed.",
  "ingestedCount": 52,
  "skippedCount": 0
}
```

### 4. List Documents
- **Endpoint**: `GET /api/documents`
- **Response**: `200 OK`
```json
{
  "documents": [
    {
      "id": "doc_1717200021345_abcde",
      "filename": "dell_xps_15_description.md",
      "product_name": "Dell XPS 15 Description",
      "category": "product_descriptions",
      "source_type": "md",
      "upload_date": "2026-06-01T10:04:47.123Z",
      "chunk_count": 2
    }
  ]
}
```

### 5. Delete Document
- **Endpoint**: `DELETE /api/documents/:id`
- **Description**: Deletes vectors from ChromaDB and metadata registry.
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Document 'dell_xps_15_description.md' has been deleted successfully."
}
```

---

## 💬 RAG Chatbot Endpoints

### 1. Execute RAG Query
- **Endpoint**: `POST /api/chat`
- **Request Body**:
```json
{
  "question": "Which laptop supports 32GB RAM?"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "answer": "The Dell XPS 15 (9530) and the Lenovo ThinkPad X1 Carbon Gen 11 support 32GB RAM configurations...",
  "confidenceScore": 0.95,
  "confidenceExplanation": "Exact factual statements matched specifications context perfectly.",
  "classification": "Product Lookup",
  "rewrittenQuery": "laptop models supporting 32gb ddr5 memory specifications",
  "sourcesUsed": [
    {
      "id": "doc_1717200021345_chunk_0",
      "filename": "dell_xps_15_description.md",
      "product_name": "Dell XPS 15 Description",
      "collection": "product_descriptions",
      "similarity": 0.74,
      "text": "Memory: 32GB DDR5 Dual Channel RAM (Supports up to 64GB RAM)..."
    }
  ],
  "traceId": "trace_1717200050123_xyz12",
  "evaluation": {
    "precision": 1.0,
    "recall": 1.0,
    "mrr": 1.0,
    "contextRelevance": 0.74,
    "faithfulness": 0.95,
    "answerRelevance": 0.9,
    "groundedness": 0.95,
    "correctness": 0.95
  }
}
```

### 2. Standalone Vector Search
- **Endpoint**: `POST /api/retrieve`
- **Request Body**:
```json
{
  "query": "gaming graphics",
  "classification": "Product Lookup"
}
```
- **Response**: `200 OK`
```json
{
  "query": "gaming graphics",
  "rewrittenQuery": "laptops suitable for gaming high graphics",
  "classification": "Product Lookup",
  "chunks": [
    {
      "id": "doc_123_chunk_1",
      "text": "Graphics: NVIDIA GeForce RTX 4080 (12GB GDDR6 VRAM)...",
      "filename": "asus_rog_zephyrus_g16.md",
      "similarity": 0.65,
      "collection": "product_descriptions"
    }
  ]
}
```

---

## 📝 Feedback Database Endpoints

### 1. Hybrid Feedback Search
- **Endpoint**: `POST /api/feedback/search`
- **Request Body**:
```json
{
  "query": "Which laptop has 32gb ram?"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "matchFound": true,
  "score": 0.88,
  "answer": "Dell XPS 15 supports up to 32GB RAM.",
  "matchedFeedbacks": [
    {
      "question": "Which laptop supports 32GB RAM?",
      "answer": "Dell XPS supports up to 32GB RAM.",
      "tags": ["laptop", "ram", "32gb", "dell"],
      "score": 0.88
    }
  ]
}
```

### 2. Add Pre-verified Feedback Node
- **Endpoint**: `POST /api/feedback/add`
- **Request Body**:
```json
{
  "question": "Which laptop supports 32GB RAM?",
  "answer": "Dell XPS supports up to 32GB RAM.",
  "tags": "laptop, ram, 32gb, dell"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Feedback entry indexed successfully.",
  "feedback": {
    "id": "fb_1717200088123_abc",
    "question": "Which laptop supports 32GB RAM?",
    "answer": "Dell XPS supports up to 32GB RAM.",
    "tags": ["laptop", "ram", "32gb", "dell", "xps", "hardware"],
    "created_at": "2026-06-01T10:04:06.123Z"
  }
}
```

---

## 📊 Evaluation & Diagnostics Endpoints

### 1. Fetch Performance Metrics Logs
- **Endpoint**: `GET /api/metrics`
- **Response**: `200 OK`
```json
{
  "totalEvaluations": 12,
  "averages": {
    "precision": 0.85,
    "recall": 0.85,
    "mrr": 0.91,
    "contextRelevance": 0.68,
    "faithfulness": 0.94,
    "answerRelevance": 0.91,
    "groundedness": 0.96,
    "correctness": 0.93
  },
  "history": [
    {
      "id": "eval_1717200050123_xyz12",
      "query": "Which laptop supports 32GB RAM?",
      "answer": "Dell XPS 15 and ThinkPad X1...",
      "classification": "Product Lookup",
      "confidence": 0.95,
      "date": "2026-06-01T10:04:47.123Z",
      "metrics": {
        "precision": 1.0,
        "recall": 1.0,
        "mrr": 1.0,
        "contextRelevance": 0.74,
        "faithfulness": 0.95,
        "answerRelevance": 0.9,
        "groundedness": 0.95,
        "correctness": 0.95
      },
      "traceId": "trace_1717200050123_xyz12"
    }
  ]
}
```
