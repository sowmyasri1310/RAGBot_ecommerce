import { Router, Request, Response, NextFunction } from 'express';
import { FeedbackService } from '../services/feedback.service';
import { DBService } from '../services/db.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /feedback/search
 * Searches the feedback database using Question Embedding + Tags Similarity + Hybrid Ranking.
 */
router.post('/feedback/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }

    const searchResult = await FeedbackService.searchFeedback(query);
    return res.status(200).json(searchResult);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /feedback/add
 * Inserts a Q&A pair. Auto-generates embedding vector and descriptive keywords.
 */
router.post('/feedback/add', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, answer, tags } = req.body;

    if (!question || !question.trim() || !answer || !answer.trim()) {
      return res.status(400).json({ error: 'Missing required fields: question and answer are required.' });
    }

    const record = await FeedbackService.addFeedback(question, answer, tags);
    return res.status(200).json({
      success: true,
      message: 'Feedback entry indexed successfully.',
      feedback: record
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /feedback
 * Lists all feedback items (useful for tag clouds and dashboard views).
 */
router.get('/feedback', (req: Request, res: Response) => {
  const feedbacks = DBService.getFeedbacks();
  
  // Also collect all unique tags for a nice frontend tag cloud!
  const allTags = new Set<string>();
  feedbacks.forEach(f => f.tags.forEach(t => allTags.add(t)));

  return res.status(200).json({
    feedbacks: feedbacks.map(f => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      tags: f.tags,
      created_at: f.created_at
    })),
    tagCloud: Array.from(allTags)
  });
});

/**
 * DELETE /feedback/:id
 * Deletes a feedback item.
 */
router.delete('/feedback/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  DBService.deleteFeedback(id);
  return res.status(200).json({ success: true, message: 'Feedback entry deleted.' });
});

export default router;
