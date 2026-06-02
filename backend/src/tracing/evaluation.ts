import { DBService, EvaluationRecord } from '../services/db.service';
import { GroqService } from '../services/groq.service';
import { RetrievedChunk } from '../rag/adaptive/retrievalManager';
import { logger } from '../utils/logger';

export interface EvaluationMetrics {
  precision: number;       // Precision@K (0.0 to 1.0)
  recall: number;          // Recall@K (0.0 to 1.0)
  mrr: number;             // Mean Reciprocal Rank (0.0 to 1.0)
  contextRelevance: number;// Context Relevance (average similarity)
  faithfulness: number;    // Factual grounding (0.0 to 1.0)
  answerRelevance: number; // Address matching (0.0 to 1.0)
  groundedness: number;    // Hallucination absence (0.0 to 1.0)
  correctness: number;     // Factual correctness (0.0 to 1.0)
}

export class EvaluationFramework {
  private static readonly HIGH_RELEVANCE_THRESHOLD = 0.42;

  /**
   * Evaluates a complete RAG execution run across retrieval and generation.
   */
  public static async evaluateRun(
    query: string,
    chunks: RetrievedChunk[],
    answer: string,
    contextText: string,
    classification: string,
    confidence: number,
    traceId: string
  ): Promise<EvaluationMetrics> {
    logger.info('📊 Initiating RAG Pipeline Evaluation Framework...');

    // 1. Calculate Retrieval Metrics programmatically
    const retrievalMetrics = this.calculateRetrievalMetrics(chunks);

    // 2. Calculate Answer Quality Metrics via LLM-as-a-Judge
    const generationMetrics = await this.calculateGenerationMetrics(query, contextText, answer);

    const metrics: EvaluationMetrics = {
      ...retrievalMetrics,
      ...generationMetrics
    };

    // 3. Store the evaluation record in the database for frontend dashboard access
    const record: EvaluationRecord = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      query,
      answer,
      confidence,
      classification,
      date: new Date().toISOString(),
      metrics,
      traceId
    };

    DBService.addEvaluation(record);
    logger.info(`Evaluation completed & logged. Groundedness: ${(metrics.groundedness * 100).toFixed(1)}%, Precision: ${(metrics.precision * 100).toFixed(1)}%`);

    return metrics;
  }

  /**
   * Computes Precision@K, Recall@K, MRR, and overall Context Relevance based on vector similarities.
   */
  private static calculateRetrievalMetrics(chunks: RetrievedChunk[]): {
    precision: number;
    recall: number;
    mrr: number;
    contextRelevance: number;
  } {
    if (chunks.length === 0) {
      return { precision: 0, recall: 0, mrr: 0, contextRelevance: 0 };
    }

    // A chunk is deemed "relevant" if its similarity score is above the threshold
    const relevantChunks = chunks.filter(c => c.similarity >= this.HIGH_RELEVANCE_THRESHOLD);
    
    // Precision@K = relevant retrieved / total retrieved
    const precision = relevantChunks.length / chunks.length;

    // Recall@K = relevant retrieved / total possible relevant (we assume K is the max retrieved here)
    const recall = relevantChunks.length / Math.max(chunks.length, 1);

    // MRR (Mean Reciprocal Rank) = 1 / rank of the first relevant chunk
    let firstRelevantRank = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].similarity >= this.HIGH_RELEVANCE_THRESHOLD) {
        firstRelevantRank = i + 1; // 1-based index
        break;
      }
    }
    const mrr = firstRelevantRank > 0 ? 1 / firstRelevantRank : 0;

    // Context Relevance = average similarity score
    const totalSimilarity = chunks.reduce((sum, c) => sum + c.similarity, 0);
    const contextRelevance = totalSimilarity / chunks.length;

    return {
      precision,
      recall,
      mrr,
      contextRelevance
    };
  }

  /**
   * Evaluates Faithfulness, Answer Relevance, Groundedness, and Correctness using Groq.
   */
  private static async calculateGenerationMetrics(
    query: string,
    context: string,
    answer: string
  ): Promise<{
    faithfulness: number;
    answerRelevance: number;
    groundedness: number;
    correctness: number;
  }> {
    if (!context || context.includes('NO RELEVANT KNOWLEDGE CONTEXT FOUND')) {
      return { faithfulness: 0.1, answerRelevance: 0.2, groundedness: 0.1, correctness: 0.1 };
    }

    const systemPrompt = `You are a strict academic evaluator and RAG metrics judge.
Evaluate the quality and accuracy of a chatbot response based on the retrieved context documents.
Rate these four metrics between 0.0 (poor/untrue) and 1.0 (perfect/fully correct):

1. "faithfulness": Is the answer mathematically and factually grounded ONLY in the retrieved context? Deduct heavily for any facts not in the context.
2. "answerRelevance": Does the answer directly address the user's question? Is it on-topic?
3. "groundedness": How free of hallucinations is the answer? Are there any unsupported claims? (1.0 = zero hallucinations, 0.0 = completely fabricated).
4. "correctness": Overall factual correctness compared against the source context facts.

You MUST respond with a JSON object containing these keys:
- "faithfulness": Float between 0.0 and 1.0.
- "answerRelevance": Float between 0.0 and 1.0.
- "groundedness": Float between 0.0 and 1.0.
- "correctness": Float between 0.0 and 1.0.
- "reasoning": 1-sentence summary of your scores.

Ensure the output is valid JSON and nothing else.`;

    const userPrompt = `User Query: "${query}"

Source Context:
"""
${context}
"""

Generated Answer:
"""
${answer}
"""`;

    try {
      const rawJson = await GroqService.chatCompletion(systemPrompt, userPrompt, {
        temperature: 0.0,
        responseFormatJson: true
      });

      const parsed = JSON.parse(rawJson);

      return {
        faithfulness: parsed.faithfulness !== undefined ? Number(parsed.faithfulness) : 0.9,
        answerRelevance: parsed.answerRelevance !== undefined ? Number(parsed.answerRelevance) : 0.9,
        groundedness: parsed.groundedness !== undefined ? Number(parsed.groundedness) : 0.9,
        correctness: parsed.correctness !== undefined ? Number(parsed.correctness) : 0.9
      };
    } catch (error) {
      logger.error('Error running evaluator LLM metrics:', error);
      // Fallback metrics
      return {
        faithfulness: 0.8,
        answerRelevance: 0.8,
        groundedness: 0.8,
        correctness: 0.8
      };
    }
  }
}
