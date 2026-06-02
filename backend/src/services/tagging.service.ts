import { GroqService } from './groq.service';
import { logger } from '../utils/logger';

export class TaggingService {
  /**
   * Generates 4-8 descriptive, comma-separated keywords from a Q&A pair using Groq.
   */
  public static async generateTags(question: string, answer: string): Promise<string> {
    const systemPrompt = `You are a metadata extraction agent.
Analyze the provided Question and Answer submission and generate between 4 and 8 descriptive tags.
Adhere strictly to these rules:
- Generate between 4 and 8 tags.
- Output MUST be a single line of comma-separated terms (e.g., "laptop, ram, 32gb, dell, xps, hardware").
- All tags must be lowercase.
- Tags must be short (single words or very short phrases).
- Include technical keywords (e.g. "ram", "oled", "gpu", "anc", "charging").
- Include product keywords (e.g. "dell", "sony", "keychron", "headphones", "keyboard").
- Include domain-specific terms (e.g. "warranty", "refunds", "shipping", "aviation").

You MUST return a JSON object with this key:
- "tags": A string containing the comma-separated list of tags.

Ensure the output is valid JSON and nothing else.`;

    const userPrompt = `Question: "${question}"
Answer: "${answer}"`;

    try {
      logger.info('Generating descriptive metadata tags for Q&A pair...');
      const rawJson = await GroqService.chatCompletion(systemPrompt, userPrompt, {
        temperature: 0.1,
        responseFormatJson: true
      });

      const parsed = JSON.parse(rawJson);
      let tagsStr = parsed.tags || '';

      // Normalize tags (ensure lowercase, remove empty elements, ensure correct counts)
      const tagsArray = tagsStr
        .split(',')
        .map((t: string) => t.trim().toLowerCase())
        .filter((t: string) => t.length > 0);

      if (tagsArray.length === 0) {
        return 'general, e-commerce, product, assistant';
      }

      // Cap/Pad to ensure between 4 and 8 tags
      const safeTags = tagsArray.slice(0, 8);
      while (safeTags.length < 4) {
        safeTags.push('retail');
      }

      const finalTags = safeTags.join(', ');
      logger.info(`Generated tags: "${finalTags}"`);
      return finalTags;
    } catch (error) {
      logger.error('Error generating tags via TaggingService:', error);
      return 'e-commerce, product, lookup, support';
    }
  }
}
