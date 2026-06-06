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
    metrics: any,
    verifierScore?: number,
    verificationStatus?: string,
    regeneratedCount?: number,
    originalAnswer?: string,
    intentAccuracy?: number,
    normalizationApplied?: boolean,
    intentConfidence?: number,
    originalQuery?: string,
    normalizedQuery?: string,
    resolvedQuery?: string,
    detectedIntent?: string,
    finalRoutedIntent?: string
  ): Promise<string> {
    const localTraceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Always print a beautiful trace tree locally for standard debugging
    logger.info(`
================= ADAPTIVE RAG PIPELINE TRACE TREE =================
Trace ID: ${localTraceId}
Query: "${originalQuery || query}"
├─ 1. Query Normalizer: "${normalizedQuery || query}" (Normalized: ${normalizationApplied ? 'Yes' : 'No'})
├─ 2. Intent Classifier: "${detectedIntent || classification}" (Confidence: ${intentConfidence !== undefined ? intentConfidence : 'N/A'}, Final Mapped Route: "${finalRoutedIntent || classification}")
├─ 3. Query Rewriter  : "${rewrittenQuery}"
├─ 4. Vector Retrieval: Collections = [${collectionsQueried.join(', ')}], Dynamic Top K = ${topK}
├─ 5. Context Selector: Selected ${chunksCount} high-value chunks
├─ 6. Answer Generator: Confidence Score = ${(confidence * 100).toFixed(1)}%
├─ 7. Answer Verifier : Score = ${verifierScore !== undefined ? verifierScore : 'N/A'}, Status = "${verificationStatus || 'N/A'}", Regens = ${regeneratedCount || 0}
└─ 8. Evaluation metrics:
     ├── Precision@K      : ${metrics.precision.toFixed(2)}
     ├── MRR              : ${metrics.mrr.toFixed(2)}
     ├── Faithfulness     : ${metrics.faithfulness.toFixed(2)}
     ├── Groundedness     : ${metrics.groundedness.toFixed(2)}
     └── Intent Accuracy  : ${metrics.intentAccuracy !== undefined ? metrics.intentAccuracy.toFixed(2) : 'N/A'}
====================================================================
`);

    if (!this.client) {
      return localTraceId;
    }

    try {
      // Pre-generate UUIDs for the run tree to associate child runs correctly
      const parentRunId = randomUUID();
      const childNormalizerId = randomUUID();
      const childClassifierId = randomUUID();
      const child1Id = randomUUID();
      const child2Id = randomUUID();
      const child3Id = randomUUID();
      const child4Id = randomUUID();
      const child5Id = randomUUID();
      const child6Id = randomUUID();
      const child7Id = randomUUID();

      // Define a parent run configuration with verification and intent outputs
      await this.client.createRun({
        id: parentRunId,
        name: 'Adaptive RAG Query Chain',
        run_type: 'chain',
        inputs: { 
          query: originalQuery || query, 
          originalQuery: originalQuery || query,
          normalizedQuery: normalizedQuery || query,
          resolvedQuery: resolvedQuery || query,
          classification: finalRoutedIntent || classification 
        },
        outputs: { 
          answer, 
          confidenceScore: confidence,
          faithfulnessScore: metrics.faithfulness,
          relevanceScore: metrics.answerRelevance,
          verificationScore: verifierScore,
          intentAccuracyScore: metrics.intentAccuracy !== undefined ? metrics.intentAccuracy : intentAccuracy,
          normalizationAppliedScore: normalizationApplied ? 1 : 0,
          intentConfidenceScore: intentConfidence,
          originalQuery: originalQuery || query,
          normalizedQuery: normalizedQuery || query,
          resolvedQuery: resolvedQuery || query,
          detectedIntent: detectedIntent || classification,
          finalRoutedIntent: finalRoutedIntent || classification
        },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 500,
        end_time: Date.now()
      });

      // Child: Query Normalizer run
      await this.client.createRun({
        id: childNormalizerId,
        name: 'Query Normalization Step',
        run_type: 'llm',
        parent_run_id: parentRunId,
        inputs: { query: originalQuery || query },
        outputs: { normalizedQuery: normalizedQuery || query, normalizationApplied },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 490,
        end_time: Date.now() - 460
      });

      // Child: Intent Classification run
      await this.client.createRun({
        id: childClassifierId,
        name: 'Intent Classification Step',
        run_type: 'llm',
        parent_run_id: parentRunId,
        inputs: { query: normalizedQuery || query },
        outputs: { detectedIntent, intentConfidence, finalRoutedIntent },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 455,
        end_time: Date.now() - 430
      });

      // Child 1: Classification run
      await this.client.createRun({
        id: child1Id,
        name: 'Query Classification Step',
        run_type: 'llm',
        parent_run_id: parentRunId,
        inputs: { query: resolvedQuery || query },
        outputs: { classification: finalRoutedIntent || classification },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 425,
        end_time: Date.now() - 410
      });

      // Child 2: Query Rewriter run
      await this.client.createRun({
        id: child2Id,
        name: 'Query Rewriting Step',
        run_type: 'llm',
        parent_run_id: parentRunId,
        inputs: { query: resolvedQuery || query },
        outputs: { rewrittenQuery },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 400,
        end_time: Date.now() - 350
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
        start_time: Date.now() - 340,
        end_time: Date.now() - 250
      });

      // Child 4: Generation run (representing the first answer generation)
      await this.client.createRun({
        id: child4Id,
        name: 'Answer Generation',
        run_type: 'llm',
        parent_run_id: parentRunId,
        inputs: { query: resolvedQuery || query, chunksCount },
        outputs: { answer: originalAnswer || answer },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 240,
        end_time: Date.now() - 150
      });

      // Child 5: Verification run (representing the answer evaluation/verifier step)
      await this.client.createRun({
        id: child5Id,
        name: 'Answer Verification',
        run_type: 'llm',
        parent_run_id: parentRunId,
        inputs: { answer: originalAnswer || answer },
        outputs: { score: verifierScore, status: verificationStatus },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 140,
        end_time: Date.now() - 100
      });

      // Child 6: Regeneration run (if regeneration happened)
      if (regeneratedCount && regeneratedCount > 0) {
        await this.client.createRun({
          id: child6Id,
          name: 'Answer Regeneration',
          run_type: 'llm',
          parent_run_id: parentRunId,
          inputs: { query: resolvedQuery || query, originalAnswer },
          outputs: { regeneratedAnswer: answer },
          project_name: LangSmithConfig.projectName,
          start_time: Date.now() - 90,
          end_time: Date.now() - 50
        });
      }

      // Child 7: Evaluation logger
      await this.client.createRun({
        id: child7Id,
        name: 'Pipeline Evaluation Framework',
        run_type: 'evaluator',
        parent_run_id: parentRunId,
        inputs: { answer, metrics },
        outputs: { evaluationStatus: 'Logged successful' },
        project_name: LangSmithConfig.projectName,
        start_time: Date.now() - 40,
        end_time: Date.now()
      });

      logger.info(`Successfully logged trace run to LangSmith server. Parent Run ID: ${parentRunId}`);
      return parentRunId;
    } catch (err) {
      logger.error('Error logging run tree to LangSmith server (bypassed locally):', err);
      return localTraceId;
    }
  }
}
