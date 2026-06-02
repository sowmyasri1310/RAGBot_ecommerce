import { RetrievedChunk } from './retrievalManager';
import { logger } from '../../utils/logger';

export interface SelectedContext {
  contextText: string;
  chunksUsed: RetrievedChunk[];
}

export class ContextSelector {
  private static readonly SIMILARITY_THRESHOLD = 0.35; // Remove low-relevance chunks
  private static readonly MAX_CHUNKS_BUDGET = 6; // Avoid context bloat

  /**
   * Cleans, deduplicates, and ranks chunks to produce a highly relevant consolidated context block.
   */
  public static select(chunks: RetrievedChunk[], query?: string): SelectedContext {
    logger.info(`Starting context selection from ${chunks.length} raw retrieved chunks...`);

    // 1. Sort initially by similarity score descending
    let sorted = [...chunks].sort((a, b) => b.similarity - a.similarity);

    // 2. Remove low-value chunks (below similarity threshold)
    const originalCount = sorted.length;
    sorted = sorted.filter(c => c.similarity >= this.SIMILARITY_THRESHOLD);
    const lowValueRemoved = originalCount - sorted.length;
    if (lowValueRemoved > 0) {
      logger.info(`Removed ${lowValueRemoved} low-value chunks below similarity threshold (${this.SIMILARITY_THRESHOLD})`);
    }

    // 3. Remove duplicate chunks (deduplicate by exact ID or exact text)
    const seenIds = new Set<string>();
    const seenTexts = new Set<string>();
    const deduplicated: RetrievedChunk[] = [];

    for (const chunk of sorted) {
      const textHash = chunk.text.trim().toLowerCase();
      if (seenIds.has(chunk.id) || seenTexts.has(textHash)) {
        continue;
      }
      seenIds.add(chunk.id);
      seenTexts.add(textHash);
      deduplicated.push(chunk);
    }

    const duplicatesRemoved = sorted.length - deduplicated.length;
    if (duplicatesRemoved > 0) {
      logger.info(`Deduplication filtered out ${duplicatesRemoved} duplicate chunks.`);
    }

    // 4. Enforce budget limit
    let budget = this.MAX_CHUNKS_BUDGET;
    if (query) {
      const qLower = query.toLowerCase();
      if (
        qLower.includes('all') || 
        qLower.includes('every') || 
        qLower.includes('each') || 
        qLower.includes('catalog') || 
        qLower.includes('15') ||
        qLower.includes('which') ||
        qLower.includes('compare') ||
        qLower.includes('list')
      ) {
        budget = 40; // Increase budget for multi-product lists and comparison queries
      }
    }

    // Diverse round-robin selection to prevent a single product from hogging the context budget
    const finalChunks: RetrievedChunk[] = [];
    const chunksByProduct = new Map<string, RetrievedChunk[]>();
    
    for (const chunk of deduplicated) {
      const prodName = chunk.metadata.product_name || 'N/A';
      if (!chunksByProduct.has(prodName)) {
        chunksByProduct.set(prodName, []);
      }
      chunksByProduct.get(prodName)!.push(chunk);
    }

    // Pull one chunk from each product in round-robin fashion until budget is reached
    const productNames = Array.from(chunksByProduct.keys());
    let addedAny = true;
    const indices = new Map<string, number>();
    productNames.forEach(p => indices.set(p, 0));

    while (finalChunks.length < budget && addedAny) {
      addedAny = false;
      for (const prod of productNames) {
        if (finalChunks.length >= budget) break;
        const idx = indices.get(prod)!;
        const productChunks = chunksByProduct.get(prod)!;
        if (idx < productChunks.length) {
          finalChunks.push(productChunks[idx]);
          indices.set(prod, idx + 1);
          addedAny = true;
        }
      }
    }
    logger.info(`Selected top ${finalChunks.length} high-value chunks for RAG generation context (budget was ${budget}).`);

    // 5. Build context representation
    let contextText = '';
    if (finalChunks.length === 0) {
      contextText = 'NO RELEVANT KNOWLEDGE CONTEXT FOUND IN THE E-COMMERCE DATABASE.';
    } else {
      contextText = finalChunks
        .map((chunk, index) => {
          const prodName = chunk.metadata.product_name || 'N/A';
          const file = chunk.metadata.filename || 'N/A';
          const score = (chunk.similarity * 100).toFixed(1);
          
          return `--- KNOWLEDGE SOURCE [${index + 1}] (File: ${file}, Product: ${prodName}, Relevance: ${score}%) ---\n${chunk.text}\n`;
        })
        .join('\n');
    }

    return {
      contextText,
      chunksUsed: finalChunks
    };
  }
}
