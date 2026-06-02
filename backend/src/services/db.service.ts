import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface FeedbackRecord {
  id: string;
  question: string;
  answer: string;
  tags: string[]; // array of short strings
  vector: number[]; // 384-dimensional embedding vector of the question
  created_at: string;
}

export interface EvaluationRecord {
  id: string;
  query: string;
  answer: string;
  confidence: number;
  classification: string;
  date: string;
  metrics: {
    precision: number;
    recall: number;
    mrr: number;
    contextRelevance: number;
    faithfulness: number;
    answerRelevance: number;
    groundedness: number;
    correctness: number;
  };
  traceId: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  product_name: string;
  category: string;
  source_type: string;
  upload_date: string;
  chunk_count: number;
}

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: any[];
  confidenceScore?: number;
}

export interface ChatSessionRecord {
  sessionId: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessageRecord[];
}

export interface ProductMetadata {
  product_name: string;
  category: string;
  price: number;
  offer_price: number;
  warranty: string;
  ram: string;
  storage: string;
  gpu: string;
  display: string;
  battery: string;
  source_file: string;
}

interface Schema {
  feedbacks: FeedbackRecord[];
  evaluations: EvaluationRecord[];
  documents: DocumentRecord[];
  chatSessions: ChatSessionRecord[];
  products: ProductMetadata[];
}

export class DBService {
  private static dbPath = path.join(__dirname, '..', '..', 'data', 'db.json');
  private static data: Schema = {
    feedbacks: [],
    evaluations: [],
    documents: [],
    chatSessions: [],
    products: []
  };

  /**
   * Initializes the database, loading it from disk or creating a blank schema.
   */
  public static async initialize(): Promise<void> {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        logger.info(`Creating data directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.dbPath)) {
        logger.info(`Loading database from: ${this.dbPath}`);
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure standard tables exist
        this.data.feedbacks = this.data.feedbacks || [];
        this.data.evaluations = this.data.evaluations || [];
        this.data.documents = this.data.documents || [];
        this.data.chatSessions = this.data.chatSessions || [];
        this.data.products = this.data.products || [];
      } else {
        logger.info(`Database not found. Creating a new one at: ${this.dbPath}`);
        this.data.products = [];
        this.save();
      }

      // Populate metadata index with standard 15 products if empty
      if (!this.data.products || this.data.products.length === 0) {
        logger.info('Pre-populating Product Metadata Index with standard 15 products.');
        const { MetadataFilterService } = require('./metadataFilter.service');
        this.data.products = MetadataFilterService.getStandardProductSpecifications();
        this.save();
      }
    } catch (error) {
      logger.error('Failed to initialize local JSON database:', error);
      throw error;
    }
  }

  /**
   * Writes the current database state to disk.
   */
  private static save(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      logger.error('Failed to write database to disk:', error);
    }
  }

  // ==========================================
  // DOCUMENT OPERATIONS
  // ==========================================
  public static getDocuments(): DocumentRecord[] {
    return this.data.documents;
  }

  public static addDocument(doc: DocumentRecord): void {
    // Remove if already exists
    this.data.documents = this.data.documents.filter(d => d.id !== doc.id);
    this.data.documents.push(doc);
    this.save();
  }

  public static deleteDocument(id: string): boolean {
    const originalLength = this.data.documents.length;
    this.data.documents = this.data.documents.filter(d => d.id !== id);
    const deleted = this.data.documents.length < originalLength;
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  // ==========================================
  // FEEDBACK OPERATIONS
  // ==========================================
  public static getFeedbacks(): FeedbackRecord[] {
    return this.data.feedbacks;
  }

  public static addFeedback(feedback: FeedbackRecord): void {
    this.data.feedbacks.push(feedback);
    this.save();
  }

  public static deleteFeedback(id: string): void {
    this.data.feedbacks = this.data.feedbacks.filter(f => f.id !== id);
    this.save();
  }

  // ==========================================
  // EVALUATION OPERATIONS
  // ==========================================
  public static getEvaluations(): EvaluationRecord[] {
    return this.data.evaluations;
  }

  public static addEvaluation(evalRecord: EvaluationRecord): void {
    this.data.evaluations.push(evalRecord);
    this.save();
  }

  public static clearEvaluations(): void {
    this.data.evaluations = [];
    this.save();
  }

  // ==========================================
  // CHAT HISTORY OPERATIONS
  // ==========================================
  public static getChatSessions(): ChatSessionRecord[] {
    return this.data.chatSessions;
  }

  public static getChatSession(sessionId: string): ChatSessionRecord | undefined {
    return this.data.chatSessions.find(s => s.sessionId === sessionId);
  }

  public static saveChatSession(session: ChatSessionRecord): void {
    const index = this.data.chatSessions.findIndex(s => s.sessionId === session.sessionId);
    if (index >= 0) {
      this.data.chatSessions[index] = session;
    } else {
      this.data.chatSessions.push(session);
    }
    this.save();
  }

  public static deleteChatSession(sessionId: string): boolean {
    const originalLength = this.data.chatSessions.length;
    this.data.chatSessions = this.data.chatSessions.filter(s => s.sessionId !== sessionId);
    const deleted = this.data.chatSessions.length < originalLength;
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  public static clearAllChatSessions(): void {
    this.data.chatSessions = [];
    this.save();
  }

  // ==========================================
  // PRODUCT METADATA OPERATIONS
  // ==========================================
  public static getProducts(): ProductMetadata[] {
    return this.data.products || [];
  }

  public static addProduct(product: ProductMetadata): void {
    this.data.products = this.data.products || [];
    this.data.products = this.data.products.filter(p => p.product_name.toLowerCase() !== product.product_name.toLowerCase());
    this.data.products.push(product);
    this.save();
  }

  public static deleteProductByFile(filename: string): void {
    this.data.products = this.data.products || [];
    this.data.products = this.data.products.filter(p => p.source_file !== filename);
    this.save();
  }

  public static clearProducts(): void {
    this.data.products = [];
    this.save();
  }
}
