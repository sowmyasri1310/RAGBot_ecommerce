import { GroqService } from '../../services/groq.service';
import { logger } from '../../utils/logger';

export class QueryRewriter {
  /**
   * Rewrites unclear or shorthand queries into dense keyword phrases optimized for vector search.
   */
  public static async rewrite(query: string): Promise<string> {
    const systemPrompt = `You are a query rewriting agent for an E-commerce Product Assistant.
Your task is to analyze the user's search query and rewrite it to maximize search relevance inside our Vector Database.
Apply these optimization rules:
- Expand abbreviations (e.g. "RTX" -> "NVIDIA RTX graphics card", "RAM" -> "RAM memory storage", "ANC" -> "active noise cancellation").
- Standardize terminology (e.g. "guarantee period" -> "warranty period", "damaged box" -> "damaged package returns").
- Refine category descriptions (e.g. "gaming laptop" -> "laptops suitable for gaming with dedicated GPU", "mac book" -> "Apple MacBook Pro").
- Preserve direct specifications (e.g. "32GB RAM" -> "32GB RAM memory").

You MUST return a JSON object with this key:
- "rewrittenQuery": The optimized search query.

Ensure the output is valid JSON and nothing else.`;

    const userPrompt = `Rewrite the following e-commerce search query:
"${query}"`;

    try {
      logger.info(`Rewriting query: "${query}"`);
      const rawJson = await GroqService.chatCompletion(systemPrompt, userPrompt, {
        temperature: 0.1,
        responseFormatJson: true
      });

      const parsed = JSON.parse(rawJson);
      const rewritten = parsed.rewrittenQuery || query;
      
      logger.info(`Rewritten query: "${rewritten}"`);
      return rewritten;
    } catch (error) {
      logger.error('Error in QueryRewriter:', error);
      // Fallback: return original query
      return query;
    }
  }
}
