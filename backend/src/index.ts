import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Import Services
import { DBService } from './services/db.service';
import { EmbeddingService } from './services/embedding.service';
import { ChromaDBService } from './services/chromadb.service';
import { GroqService } from './services/groq.service';
import { LangSmithTracer } from './tracing/langsmith';
import { logger } from './utils/logger';

// Import Routes
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import feedbackRoutes from './routes/feedback.routes';
import taggingRoutes from './routes/tagging.routes';
import evaluationRoutes from './routes/evaluation.routes';
import productRoutes from './routes/product.routes';

// Load Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // For direct developmental ease
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    groqMockMode: GroqService.checkMockMode()
  });
});

// Mount Routes under standard /api endpoint prefix
app.use('/api', documentRoutes);
app.use('/api', chatRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', taggingRoutes);
app.use('/api', evaluationRoutes);
app.use('/api', productRoutes);

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

/**
 * Initializes and spins up the server.
 */
async function startServer() {
  logger.info('Starting backend services initialization sequence...');

  try {
    // 1. Initialize local JSON databases
    await DBService.initialize();

    // 2. Initialize local Xenova Transformers embedding pipeline
    await EmbeddingService.initialize();

    // 3. Connect to ChromaDB HTTP Server and create collections
    await ChromaDBService.initialize();

    // 4. Initialize Groq SDK and trace endpoints
    GroqService.initialize();
    LangSmithTracer.initialize();

    // Start Express Listener
    app.listen(PORT, () => {
      logger.info(`🚀 Adaptive RAG Express server is running on http://localhost:${PORT}`);
      logger.info(`💚 Health check endpoint at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ CRITICAL: Inception server startup failed due to dependency initialization error:', error);
    process.exit(1);
  }
}

// Start Server
startServer();
