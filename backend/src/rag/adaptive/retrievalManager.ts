import { ChromaDBService } from '../../services/chromadb.service';
import { EmbeddingService } from '../../services/embedding.service';
import { logger } from '../../utils/logger';

export interface RetrievedChunk {
  id: string;
  text: string;
  metadata: {
    document_id: string;
    filename: string;
    product_name: string;
    category: string;
    source_type: string;
    upload_date: string;
    chunk_index: number;
    [key: string]: any;
  };
  distance: number;
  similarity: number;
  collection: string;
}

export class RetrievalManager {
  /**
   * Dynamically retrieves chunks from target collections based on query classification and rewritten terms.
   */
  public static async retrieve(
    rewrittenQuery: string,
    classification: string,
    where?: any
  ): Promise<RetrievedChunk[]> {
    logger.info(`Rerouting retrieval based on classification: '${classification}'`);
    
    // We keep existing catalog listing chunk generation logic for safety, but it's now bypassed by the router
    if (classification === 'PRODUCT_CATALOG') {
      logger.info('Query routing matched PRODUCT_CATALOG. Bypassing vector search and invoking getAllProducts().');
      
      const products = await ChromaDBService.getAllProducts();
      
      // Construct a single consolidated high-value synthetic chunk listing all products in store
      const catalogText = `Available Products:
${products.map(p => `• ${p.product_name}`).join('\n')}

Total Products: ${products.length}`;

      const chunk: RetrievedChunk = {
        id: 'catalog_overview_chunk',
        text: catalogText,
        metadata: {
          document_id: 'catalog_metadata',
          filename: 'catalog_descriptions.md',
          product_name: 'Catalog Listing',
          category: 'product_descriptions',
          source_type: 'md',
          upload_date: new Date().toISOString(),
          chunk_index: 0
        },
        distance: 0.0,
        similarity: 1.0,
        collection: 'product_descriptions'
      };

      // Add debug logging: "Log: Query type, topK selected, Number of chunks retrieved, Product names found"
      logger.info('================ RETRIEVAL DEBUG LOGS ================');
      logger.info(`Query Type Detected     : ${classification}`);
      logger.info(`topK Selected           : N/A (Bypassed)`);
      logger.info(`Chunks Retrieved        : 1`);
      logger.info(`Product Names Found     : [${products.map(p => p.product_name).join(', ')}]`);
      logger.info('======================================================');

      return [chunk];
    }

    const qLower = rewrittenQuery.toLowerCase();
    const isAllProductsQuery = qLower.includes('all') || qLower.includes('every') || qLower.includes('each') || qLower.includes('catalog') || qLower.includes('15');

    // 2. Determine Dynamic Strategy parameters with increased retrieval depth (15 to 25)
    let targetCollections: string[] = [];
    let topK = 15;

    if (isAllProductsQuery) {
      targetCollections = ['product_descriptions', 'manuals', 'warranty', 'returns', 'faqs'];
      topK = 100;
    } else {
      switch (classification) {
        case 'PRODUCT_DETAIL':
        case 'PRODUCT_CHEAPEST':
        case 'PRODUCT_COSTLIEST':
        case 'PRODUCT_PRICE_LIST':
        case 'PRODUCT_FILTER':
          targetCollections = ['product_descriptions', 'manuals'];
          topK = 25;
          break;
        case 'NORMAL_RAG': {
          const q = rewrittenQuery.toLowerCase();
          if (/\b(compare|comparison|vs|versus|difference between|differ)\b/i.test(q)) {
            targetCollections = ['product_descriptions', 'manuals'];
            topK = 25;
          } else if (/\b(recommend|recommendation|best|suggest|suitable|advise|for travel|for gaming|for video editing)\b/i.test(q)) {
            targetCollections = ['product_descriptions', 'manuals', 'faqs'];
            topK = 25;
          } else if (/\b(warranty|guarantee)\b/i.test(q)) {
            targetCollections = ['warranty', 'manuals'];
            topK = 15;
          } else if (/\b(return|refund|policy|restocking|fee|return window|return policy)\b/i.test(q)) {
            targetCollections = ['returns'];
            topK = 15;
          } else {
            targetCollections = ['faqs', 'shipping'];
            topK = 15;
          }
          break;
        }
        default:
          targetCollections = ['faqs', 'shipping'];
          topK = 15;
          break;
      }
    }

    try {
      // 3. Generate vector embedding of the rewritten query
      logger.info('Generating embedding vector for query retrieval...');
      const queryVector = await EmbeddingService.generate(rewrittenQuery);

      // 4. Query all target collections in parallel
      logger.info(`Issuing parallel vector search in collections: [${targetCollections.join(', ')}] with topK = ${topK}`);
      
      const queryPromises = targetCollections.map(async (colName) => {
        try {
          const results = await ChromaDBService.queryCollection(colName, queryVector, topK, where);
          return results.map(item => ({
            ...item,
            collection: colName
          })) as RetrievedChunk[];
        } catch (err) {
          logger.error(`Error querying collection '${colName}' in pipeline:`, err);
          return [] as RetrievedChunk[];
        }
      });

      const nestedResults = await Promise.all(queryPromises);
      
      // 5. Flatten all retrieved items
      const aggregatedChunks = nestedResults.flat();
      
      // Extract products found in metadata to log
      const foundProducts = new Set<string>();
      aggregatedChunks.forEach(c => {
        if (c.metadata && c.metadata.product_name) {
          foundProducts.add(c.metadata.product_name);
        }
      });

      // Add debug logging as requested
      logger.info('================ RETRIEVAL DEBUG LOGS ================');
      logger.info(`Query Type Detected     : ${classification}`);
      logger.info(`topK Selected           : ${topK}`);
      logger.info(`Chunks Retrieved        : ${aggregatedChunks.length}`);
      logger.info(`Product Names Found     : [${Array.from(foundProducts).join(', ')}]`);
      logger.info('======================================================');

      return aggregatedChunks;
    } catch (error) {
      logger.error('Error in RetrievalManager:', error);
      return [];
    }
  }
}
