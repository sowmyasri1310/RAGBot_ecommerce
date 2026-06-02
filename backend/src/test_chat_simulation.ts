import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config();

import { DBService } from './services/db.service';
import { QueryClassifier } from './rag/adaptive/queryClassifier';
import { RetrievalManager } from './rag/adaptive/retrievalManager';
import { ContextSelector } from './rag/adaptive/contextSelector';
import { MetadataFilterService } from './services/metadataFilter.service';
import { EmbeddingService } from './services/embedding.service';
import { ChromaDBService } from './services/chromadb.service';

async function simulate() {
  try {
    await DBService.initialize();
    await EmbeddingService.initialize();
    await ChromaDBService.initialize();

    const query = "Which product is cheapest?";
    console.log("Query:", query);

    const classificationResult = await QueryClassifier.classify(query);
    console.log("Classification:", classificationResult.classification);

    const matchingProducts = MetadataFilterService.filterProducts(query, classificationResult.classification);
    console.log("Matching Products:", matchingProducts.map(p => `${p.product_name} ($${p.price})`));

    const structuredContext = MetadataFilterService.generateStructuredContext(matchingProducts);
    console.log("Structured Context Length:", structuredContext.length);
    console.log("Structured Context:\n", structuredContext);

    const retrievedChunks = await RetrievalManager.retrieve(query, classificationResult.classification);
    console.log("Retrieved Chunks Count:", retrievedChunks.length);
    for (let i = 0; i < retrievedChunks.length; i++) {
      console.log(`Chunk ${i+1}: file=${retrievedChunks[i].metadata.filename}, product=${retrievedChunks[i].metadata.product_name}`);
    }

    let candidateChunks = retrievedChunks;

    const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchingNormalized = matchingProducts.map(p => normalize(p.product_name));
    console.log("Matching Normalized Names:", matchingNormalized);

    candidateChunks = candidateChunks.filter(chunk => {
      const chunkProdNormalized = normalize(chunk.metadata.product_name || '');
      const chunkFileNormalized = normalize(chunk.metadata.filename || '');
      console.log(`Comparing chunk: prod="${chunkProdNormalized}" file="${chunkFileNormalized}"`);
      const matched = matchingNormalized.some(name => 
        chunkProdNormalized.includes(name) || 
        name.includes(chunkProdNormalized) ||
        chunkFileNormalized.includes(name) ||
        name.includes(chunkFileNormalized)
      );
      console.log(`Matched: ${matched}`);
      return matched;
    });

    const selection = ContextSelector.select(candidateChunks, query);
    let finalChunksUsed = selection.chunksUsed;
    console.log("Selected Chunks Count:", finalChunksUsed.length);

  } catch (error) {
    console.error("Crash:", error);
  }
}

simulate();
