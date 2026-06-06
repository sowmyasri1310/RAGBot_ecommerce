import { Router, Request, Response, NextFunction } from 'express';
import { EvaluationFramework } from '../tracing/evaluation';
import { DBService } from '../services/db.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /evaluate
 * Manually trigger pipeline evaluations for custom query-context-response configurations.
 */
router.post('/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, context, answer, classification = 'FAQ Query', confidence = 0.85 } = req.body;

    if (!query || !context || !answer) {
      return res.status(400).json({ error: 'Missing required parameters: query, context, and answer are required.' });
    }

    const evaluationMetrics = await EvaluationFramework.evaluateRun(
      query,
      [], // No raw vector chunk list for manual calls, metrics will derive from LLM-as-a-judge
      answer,
      context,
      classification,
      confidence,
      'manual_eval'
    );

    return res.status(200).json({
      success: true,
      metrics: evaluationMetrics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /metrics
 * Calculates and returns chronological history logs and aggregate averages for all 8 evaluation metrics.
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const evaluations = DBService.getEvaluations();

    if (evaluations.length === 0) {
      return res.status(200).json({
        totalEvaluations: 0,
        averages: {
          precision: 0,
          recall: 0,
          mrr: 0,
          contextRelevance: 0,
          faithfulness: 0,
          answerRelevance: 0,
          groundedness: 0,
          correctness: 0,
          intentAccuracy: 0,
          intentConfidence: 0
        },
        history: []
      });
    }

    // Compute averages
    const count = evaluations.length;
    const totals = evaluations.reduce(
      (sums, ev) => {
        sums.precision += ev.metrics.precision || 0;
        sums.recall += ev.metrics.recall || 0;
        sums.mrr += ev.metrics.mrr || 0;
        sums.contextRelevance += ev.metrics.contextRelevance || 0;
        sums.faithfulness += ev.metrics.faithfulness || 0;
        sums.answerRelevance += ev.metrics.answerRelevance || 0;
        sums.groundedness += ev.metrics.groundedness || 0;
        sums.correctness += ev.metrics.correctness || 0;
        sums.intentAccuracy += ev.intentAccuracy !== undefined ? ev.intentAccuracy : 0;
        sums.intentConfidence += ev.intentConfidence !== undefined ? ev.intentConfidence : 0;
        return sums;
      },
      {
        precision: 0,
        recall: 0,
        mrr: 0,
        contextRelevance: 0,
        faithfulness: 0,
        answerRelevance: 0,
        groundedness: 0,
        correctness: 0,
        intentAccuracy: 0,
        intentConfidence: 0
      }
    );

    const averages = {
      precision: totals.precision / count,
      recall: totals.recall / count,
      mrr: totals.mrr / count,
      contextRelevance: totals.contextRelevance / count,
      faithfulness: totals.faithfulness / count,
      answerRelevance: totals.answerRelevance / count,
      groundedness: totals.groundedness / count,
      correctness: totals.correctness / count,
      intentAccuracy: totals.intentAccuracy / count,
      intentConfidence: totals.intentConfidence / count
    };

    return res.status(200).json({
      totalEvaluations: count,
      averages,
      history: evaluations.map(ev => ({
        id: ev.id,
        query: ev.query,
        answer: ev.answer,
        classification: ev.classification,
        confidence: ev.confidence,
        date: ev.date,
        metrics: ev.metrics,
        traceId: ev.traceId,
        verifierScore: ev.verifierScore,
        verificationStatus: ev.verificationStatus,
        regeneratedCount: ev.regeneratedCount,
        intentAccuracy: ev.intentAccuracy,
        normalizationApplied: ev.normalizationApplied,
        intentConfidence: ev.intentConfidence,
        originalQuery: ev.originalQuery,
        normalizedQuery: ev.normalizedQuery,
        resolvedQuery: ev.resolvedQuery,
        detectedIntent: ev.detectedIntent,
        finalRoutedIntent: ev.finalRoutedIntent
      }))
    });
  } catch (error) {
    logger.error('Failed to calculate metrics logs:', error);
    return res.status(500).json({ error: 'Failed to retrieve metrics logs.' });
  }
});

/**
 * DELETE /metrics/reset
 * Resets evaluation history (useful for running fresh pipeline cleanups).
 */
router.delete('/metrics/reset', (req: Request, res: Response) => {
  DBService.clearEvaluations();
  return res.status(200).json({ success: true, message: 'Historical metrics reset successfully.' });
});

export default router;
