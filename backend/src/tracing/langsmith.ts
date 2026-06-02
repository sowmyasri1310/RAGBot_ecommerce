import { Client } from 'langsmith';
import { LangSmithConfig } from './config';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export class LangSmithTracer {
  private static client: Client | null = null;

  /**
   * Initializes the LangSmith client.
   */
  public static initialize(): void {
    if (!LangSmithConfig.isEnabled) {
      return;
    }

    try {
      this.client = new Client({
        apiKey: LangSmithConfig.apiKey,
        apiUrl: LangSmithConfig.endpoint
      });
      logger.info('LangSmith Tracer Client initialized.');
    } catch (error) {
      logger.error('Error creating LangSmith Client:', error);
    }
  }

  /**
   * Logs a complete structured run tree representing our Adaptive RAG operations.
   */
  public static async logPipelineRun(
    query: string,
    rewrittenQuery: string,
    classification: string,
    collectionsQueried: string[],
    topK: number,
    chunksCount: number,
    answer: string,
    confidence: number,
    metrics: any
  ): Promise<string> {
    const localTraceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Always print a beautiful trace tree locally for standard debugging
    logger.info(`
================= ADAPTIVE RAG PIPELINE TRACE TREE =================
Trace ID: ${localTraceId}
Query: "${query}"
├─ 1. Query Classifier: "${classification}"
├─ 2. Query Rewriter  : "${rewrittenQuery}"
├─ 3. Vector Retrieval: Collections = [${collectionsQueried.join(', ')}], Dynamic Top K = ${topK}
├─ 4. Context Selector: Selected ${chunksCount} high-value chunks
├─ 5. Answer Generator: Confidence Score = ${(confidence * 100).toFixed(1)}%
└─ 6. Evaluation metrics:
     ├── Precision@K      : ${metrics.precision.toFixed(2)}
     ├── MRR              : ${metrics.mrr.toFixed(2)}
     ├── Faithfulness     : ${metrics.faithfulness.toFixed(2)}
     └── Groundedness     : ${metrics.groundedness.toFixed(2)}
====================================================================
`);

    if (!this.client) {
      return localTraceId;
    }

    try {
      // Pre-generate UUIDs for the run tree to associate child runs correctly
      const parentRunId = randomUUID();
      const child1Id = randomUUID();
      const child2Id = randomUUID();
      const child3Id = randomUUID();
      const child4Id = randomUUID();

      // Define a run configuration
      await this.client.createRun({
        id: parentRunId,
        name: 'Adaptive RAG Query Chain',
        run_type: 'chain',
        inputs: { query, classification },
        outputs: { answer, confidenceScore: confidence },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 500,
        end_time: Date.now()
      });

      // Child 1: Classification run
      await this.client.createRun({
        id: child1Id,
        name: 'Query Classification Step',
        run_type: 'llm',
        parent_run_id: parentRunId,
        inputs: { query },
        outputs: { classification },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 450,
        end_time: Date.now() - 400
      });

      // Child 2: Query Rewriter run
      await this.client.createRun({
        id: child2Id,
        name: 'Query Rewriting Step',
        run_type: 'llm',
        parent_run_id: parentRunId,
        inputs: { query },
        outputs: { rewrittenQuery },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 380,
        end_time: Date.now() - 300
      });

      // Child 3: Vector retrieval run
      await this.client.createRun({
        id: child3Id,
        name: 'ChromaDB Vector Retrieval',
        run_type: 'retriever',
        parent_run_id: parentRunId,
        inputs: { rewrittenQuery, targetCollections: collectionsQueried, dynamicK: topK },
        outputs: { chunksCount },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 280,
        end_time: Date.now() - 150
      });

      // Child 4: Evaluation logger
      await this.client.createRun({
        id: child4Id,
        name: 'Pipeline Evaluation Framework',
        run_type: 'evaluator',
        parent_run_id: parentRunId,
        inputs: { answer, metrics },
        outputs: { evaluationStatus: 'Logged successful' },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 50,
        end_time: Date.now()
      });

      logger.info(`Successfully logged trace run to LangSmith server. Run ID: ${parentRunId}`);
      return parentRunId;
    } catch (err) {
      logger.error('Error logging run tree to LangSmith server (bypassed locally):', err);
      return localTraceId;
    }
  }
}
