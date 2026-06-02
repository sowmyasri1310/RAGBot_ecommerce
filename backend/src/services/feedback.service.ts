import { DBService, FeedbackRecord } from './db.service';
import { EmbeddingService } from './embedding.service';
import { TaggingService } from './tagging.service';
import { GroqService } from './groq.service';
import { logger } from '../utils/logger';

export interface FeedbackSearchResult {
  success: boolean;
  matchFound: boolean;
  score?: number;
  answer: string;
  matchedFeedbacks: Array<{
    question: string;
    answer: string;
    tags: string[];
    score: number;
  }>;
}

export class FeedbackService {
  private static readonly RELEVANCE_THRESHOLD = 0.65; // Threshold for a valid feedback match

  /**
   * Adds a new feedback record. Automatically generates embeddings and tags.
   */
  public static async addFeedback(question: string, answer: string, customTags?: string): Promise<FeedbackRecord> {
    try {
      logger.info(`Adding feedback record for: "${question}"`);
      
      // 1. Generate descriptive tags
      let tagsStr = customTags;
      if (!tagsStr) {
        tagsStr = await TaggingService.generateTags(question, answer);
      }
      
      const tagsArray = tagsStr
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      // 2. Generate vector embedding of the question
      const vector = await EmbeddingService.generate(question);

      const record: FeedbackRecord = {
        id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        question,
        answer,
        tags: tagsArray,
        vector,
        created_at: new Date().toISOString()
      };

      DBService.addFeedback(record);
      logger.info('Feedback record added successfully.');
      return record;
    } catch (error) {
      logger.error('Failed to add feedback record:', error);
      throw error;
    }
  }

  /**
   * Performs a 3-tier hybrid search on the feedback database.
   */
  public static async searchFeedback(userQuery: string): Promise<FeedbackSearchResult> {
    try {
      logger.info(`Performing hybrid feedback search for query: "${userQuery}"`);
      const feedbacks = DBService.getFeedbacks();

      if (feedbacks.length === 0) {
        return {
          success: true,
          matchFound: false,
          answer: "I don't have that information in the database.",
          matchedFeedbacks: []
        };
      }

      // 1. Question Vector Similarity
      const queryVector = await EmbeddingService.generate(userQuery);

      // 2. Generate Tags for search query to match against stored tags
      // For simple tokenization overlap, let's extract words from userQuery
      const queryTags = userQuery
        .toLowerCase()
        .replace(/[^\w\s,]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2); // filter out short stop words

      const scoredFeedbacks = feedbacks.map((fb) => {
        // Dot product calculation (vectors are already normalized to unit length)
        let vectorSimilarity = 0;
        if (fb.vector && fb.vector.length === queryVector.length) {
          vectorSimilarity = queryVector.reduce((sum, val, idx) => sum + val * fb.vector[idx], 0);
        }

        // Tag overlap calculation
        let tagOverlap = 0;
        if (fb.tags && fb.tags.length > 0 && queryTags.length > 0) {
          const matchingTags = fb.tags.filter(t => queryTags.includes(t) || queryTags.some(qt => t.includes(qt) || qt.includes(t)));
          tagOverlap = matchingTags.length / Math.max(fb.tags.length, queryTags.length, 1);
        }

        // Hybrid ranking
        const hybridScore = 0.7 * vectorSimilarity + 0.3 * tagOverlap;

        return {
          fb,
          vectorSimilarity,
          tagOverlap,
          hybridScore
        };
      });

      // Sort by hybrid score in descending order
      scoredFeedbacks.sort((a, b) => b.hybridScore - a.hybridScore);

      // Filter matches above the threshold
      const relevantMatches = scoredFeedbacks.filter(m => m.hybridScore >= this.RELEVANCE_THRESHOLD);

      logger.info(`Feedback search found ${relevantMatches.length} matches above threshold ${this.RELEVANCE_THRESHOLD}`);

      if (relevantMatches.length === 0) {
        return {
          success: true,
          matchFound: false,
          answer: "I don't have that information in the database.",
          matchedFeedbacks: []
        };
      }

      const matchDetails = relevantMatches.map(m => ({
        question: m.fb.question,
        answer: m.fb.answer,
        tags: m.fb.tags,
        score: m.hybridScore
      }));

      // Case A: Exactly one relevant match exists
      if (relevantMatches.length === 1) {
        const best = relevantMatches[0];
        logger.info(`Exactly one match found: "${best.fb.question}" (Score: ${best.hybridScore.toFixed(3)})`);
        return {
          success: true,
          matchFound: true,
          score: best.hybridScore,
          answer: best.fb.answer,
          matchedFeedbacks: matchDetails
        };
      }

      // Case B: Multiple matches exist - Synthesize the answers!
      logger.info(`Multiple matches found (${relevantMatches.length}). Synthesizing answers...`);
      const synthesisPrompt = `You are an e-commerce assistant. Synthesize a single comprehensive, concise answer to the customer's question based ONLY on the following matching pre-verified Question & Answer records from our database.
Keep the tone helpful and professional. Do not invent facts beyond the matches.

Pre-verified Database Matches:
${relevantMatches.map((m, idx) => `Match [${idx + 1}] (Score: ${m.hybridScore.toFixed(2)}):
Q: ${m.fb.question}
A: ${m.fb.answer}
`).join('\n')}

User Query: "${userQuery}"`;

      const synthesizedAnswer = await GroqService.chatCompletion(
        synthesisPrompt,
        `Provide a synthesized response for the query: "${userQuery}"`,
        { temperature: 0.2 }
      );

      return {
        success: true,
        matchFound: true,
        score: relevantMatches[0].hybridScore,
        answer: synthesizedAnswer,
        matchedFeedbacks: matchDetails
      };
    } catch (error) {
      logger.error('Error during hybrid feedback search:', error);
      return {
        success: false,
        matchFound: false,
        answer: "I don't have that information in the database.",
        matchedFeedbacks: []
      };
    }
  }
}
