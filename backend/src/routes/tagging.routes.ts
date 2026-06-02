import { Router, Request, Response, NextFunction } from 'express';
import { TaggingService } from '../services/tagging.service';

const router = Router();

/**
 * POST /generate-tags
 * Receives Question and Answer, generates 4-8 technical descriptive tags.
 */
router.post('/generate-tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Missing required parameters: question and answer are required.' });
    }

    const tagsStr = await TaggingService.generateTags(question, answer);
    return res.status(200).json({
      success: true,
      tags: tagsStr
    });
  } catch (error) {
    next(error);
  }
});

export default router;
