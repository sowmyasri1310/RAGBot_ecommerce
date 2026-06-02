import { logger } from '../utils/logger';

// Dynamic import helper to support both CJS and ESM for Xenova transformers
let pipelinePromise: any = null;

async function getPipeline() {
  if (!pipelinePromise) {
    // Dynamic import to avoid any import resolution warnings
    pipelinePromise = import('@xenova/transformers').then((module) => {
      // Set local cache options if needed
      module.env.allowLocalModels = false;
      return module.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    });
  }
  return pipelinePromise;
}

export class EmbeddingService {
  private static extractor: any = null;

  /**
   * Initializes the embedding model by downloading and caching it.
   */
  public static async initialize(): Promise<void> {
    if (this.extractor) return;
    
    try {
      logger.info('Initializing local embedding model (Xenova/all-MiniLM-L6-v2)...');
      this.extractor = await getPipeline();
      logger.info('Local embedding model initialized successfully.');
    } catch (error) {
      logger.error('Failed to initialize local embedding model:', error);
      throw error;
    }
  }

  /**
   * Generates a 384-dimensional embedding vector for a given input text.
   */
  public static async generate(text: string): Promise<number[]> {
    try {
      if (!this.extractor) {
        await this.initialize();
      }

      // Clean the text slightly before embedding
      const cleanedText = text.replace(/\s+/g, ' ').trim();
      if (!cleanedText) {
        return new Array(384).fill(0);
      }

      const output = await this.extractor(cleanedText, { 
        pooling: 'mean', 
        normalize: true 
      });

      // Output data is a Float32Array, convert it to a standard JS number array
      const vector = Array.from(output.data) as number[];
      
      if (vector.length !== 384) {
        logger.warn(`Expected 384-dimension embedding, but got ${vector.length}. Padding/slicing.`);
        if (vector.length < 384) {
          return [...vector, ...new Array(384 - vector.length).fill(0)];
        } else {
          return vector.slice(0, 384);
        }
      }

      return vector;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      // Return a dummy embedding of size 384 as a graceful fallback in case of strict offline failure
      logger.warn('Returning fallback mock zero-vector embedding due to generation error.');
      return new Array(384).fill(0);
    }
  }
}
