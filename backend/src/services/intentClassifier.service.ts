import { GroqService } from './groq.service';
import { logger } from '../utils/logger';

export interface IntentClassificationResult {
  intent: string;
  confidence: number;
}

export class IntentClassifier {
  private static readonly CONFIDENCE_THRESHOLD = 0.65; // configurable threshold

  public static async classify(
    normalizedQuery: string,
    normalizerIntent?: string,
    normalizerConfidence?: number
  ): Promise<IntentClassificationResult> {
    logger.info(`[IntentClassifier] Classifying normalized query: "${normalizedQuery}"...`);

    // If Groq is in mock mode, bypass LLM classification and use programmatic intent
    if (GroqService.checkMockMode()) {
      logger.info('[IntentClassifier] Groq in Mock Mode. Using normalizer-detected intent.');
      const finalIntent = normalizerIntent || 'UNKNOWN';
      const confidence = normalizerConfidence !== undefined ? normalizerConfidence : 0.90;
      
      // Handle confidence thresholding
      if (confidence < this.CONFIDENCE_THRESHOLD) {
        logger.warn(`[IntentClassifier] Intent confidence (${confidence}) below threshold (${this.CONFIDENCE_THRESHOLD}). Routing to UNKNOWN.`);
        return { intent: 'UNKNOWN', confidence };
      }
      
      return { intent: finalIntent, confidence };
    }

    try {
      const systemPrompt = `Classify the following user query into exactly one category.

Categories:
- CATALOG_PRODUCTS
- CATALOG_LAPTOPS
- CATALOG_MOBILES
- PRODUCT_DETAIL
- PRICE_QUERY
- CHEAPEST_PRODUCT
- COSTLIEST_PRODUCT
- CHEAPEST_LAPTOP
- COSTLIEST_LAPTOP
- WARRANTY_QUERY
- FAQ_QUERY
- COMPARISON_QUERY
- SHIPPING_QUERY
- RETURN_POLICY_QUERY
- GREETING
- UNKNOWN

Return JSON only:
{
  "intent": "...",
  "confidence": 0.0-1.0
}
Ensure the output is valid JSON and nothing else.`;

      const responseText = await GroqService.chatCompletion(systemPrompt, `Query: "${normalizedQuery}"`, {
        temperature: 0.0,
        responseFormatJson: true
      });

      const parsed = JSON.parse(responseText);
      const confidence = parsed.confidence !== undefined ? Number(parsed.confidence) : 0.90;
      let finalIntent = parsed.intent || 'UNKNOWN';

      // Confidence Handling:
      if (confidence < this.CONFIDENCE_THRESHOLD) {
        logger.warn(`[IntentClassifier] Intent confidence (${confidence}) below threshold (${this.CONFIDENCE_THRESHOLD}). Overriding to UNKNOWN.`);
        finalIntent = 'UNKNOWN';
      }

      logger.info(`[IntentClassifier] Detected Intent: "${finalIntent}" (Confidence: ${confidence})`);
      return {
        intent: finalIntent,
        confidence
      };
    } catch (error) {
      logger.error('[IntentClassifier] LLM classification failed. Falling back to normalizer intent.', error);
      const finalIntent = normalizerIntent || 'UNKNOWN';
      const confidence = normalizerConfidence !== undefined ? normalizerConfidence : 0.80;

      if (confidence < this.CONFIDENCE_THRESHOLD) {
        return { intent: 'UNKNOWN', confidence };
      }
      return { intent: finalIntent, confidence };
    }
  }

  /**
   * Maps the new 16 intents to the existing pipeline's 9 legacy intents.
   * Ensures that no existing query routing, metadata filtering, or Adaptive RAG functionality breaks.
   */
  public static mapIntentToLegacy(intent: string, query: string): string {
    const qLower = query.toLowerCase();
    switch (intent) {
      case 'GREETING':
        return 'GREETING';
      case 'CATALOG_PRODUCTS':
        return 'PRODUCT_CATALOG';
      case 'CATALOG_LAPTOPS':
      case 'CATALOG_MOBILES':
      case 'CHEAPEST_LAPTOP':
      case 'COSTLIEST_LAPTOP':
        return 'PRODUCT_FILTER';
      case 'PRODUCT_DETAIL':
        return 'PRODUCT_DETAIL';
      case 'PRICE_QUERY': {
        // Check if query mentions a specific product name dynamically from metadata
        const { MetadataFilterService } = require('./metadataFilter.service');
        const products = MetadataFilterService.getAllProductSpecifications();
        const mentionsProduct = products.some(p => {
          const name = p.product_name.toLowerCase();
          const words = name.split(' ');
          const firstTwo = words.slice(0, 2).join(' ');
          return qLower.includes(name) || qLower.includes(firstTwo);
        });
        return mentionsProduct ? 'PRODUCT_PRICE_SINGLE' : 'PRODUCT_PRICE_LIST';
      }

      case 'CHEAPEST_PRODUCT':
        return 'PRODUCT_CHEAPEST';
      case 'COSTLIEST_PRODUCT':
        return 'PRODUCT_COSTLIEST';
      case 'WARRANTY_QUERY':
      case 'FAQ_QUERY':
      case 'COMPARISON_QUERY':
      case 'SHIPPING_QUERY':
      case 'RETURN_POLICY_QUERY':
      case 'UNKNOWN':
      default:
        return 'NORMAL_RAG'; // safe generic search path / standard RAG fallback
    }
  }
}
