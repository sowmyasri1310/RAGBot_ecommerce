import { GroqService } from './groq.service';
import { MetadataFilterService } from './metadataFilter.service';
import { logger } from '../utils/logger';

export interface NormalizationResult {
  normalizedQuery: string;
  detectedIntent: string;
  confidence: number;
}

export class QueryNormalizer {
  private static readonly LAPTOP_SYNONYMS = ['laptop', 'laptops', 'notebook', 'notebooks', 'notebook computer', 'notebook computers', 'portable computer', 'portable computers'];
  private static readonly MOBILE_SYNONYMS = ['mobile', 'mobiles', 'phone', 'phones', 'smartphone', 'smartphones', 'mobile phones'];
  private static readonly CHEAPEST_SYNONYMS = ['cheap', 'cheapest', 'lowest', 'minimum price', 'budget', 'affordable', 'least expensive', 'most cheap', 'budget option', 'lowest?', 'cheapest?', 'which one is cheapest'];
  private static readonly COSTLIEST_SYNONYMS = ['costliest', 'most expensive', 'highest', 'premium', 'highest price', 'most expensive item', 'highest?', 'premium product'];

  /**
   * Rewrites short, ambiguous, or follow-up e-commerce queries using context and history.
   */
  public static async normalize(
    query: string,
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<NormalizationResult> {
    logger.info(`[QueryNormalizer] Normalizing query: "${query}"...`);
    const qLower = query.toLowerCase().trim().replace(/[?.]/g, '');

    // Get products dynamically from metadata source
    const products = MetadataFilterService.getAllProductSpecifications();

    // 1. Programmatic synonym check & rewriting in mock mode
    if (GroqService.checkMockMode()) {
      logger.info('[QueryNormalizer] Groq in Mock Mode. Resolving query programmatically.');
      return this.normalizeProgrammatically(query, chatHistory, products);
    }

    // 2. Live Mode: Groq-based normalization
    try {
      const systemPrompt = `You are a professional e-commerce query normalizer.
Your goal is to rewrite short, ambiguous, or follow-up queries into complete, standalone, canonical search queries.

Synonym Dictionary:
- Laptops: ${JSON.stringify(this.LAPTOP_SYNONYMS)}
- Mobiles: ${JSON.stringify(this.MOBILE_SYNONYMS)}
- Cheapest: ${JSON.stringify(this.CHEAPEST_SYNONYMS)}
- Costliest: ${JSON.stringify(this.COSTLIEST_SYNONYMS)}

E-commerce Context (Current Catalog Products):
${JSON.stringify(products.map(p => ({ name: p.product_name, category: p.category, price: p.offer_price })), null, 2)}

Strict Guidelines:
1. Expand short queries (e.g., "lowest?") to include the context (e.g., "What is the cheapest product available?").
2. Resolve pronouns or follow-up questions from the recent chat history (e.g., "what about warranty?" after discussing Dell XPS 15 -> "What is the warranty of Dell XPS 15?").
3. Standardize synonyms to canonical forms (e.g., "notebooks" -> "laptops", "phones" -> "mobile phones").
4. If a query is already explicit and standalone, keep it as-is but ensure synonyms are mapped.

Return JSON only:
{
  "normalizedQuery": "...",
  "detectedIntent": "...", // Classify into one of: CATALOG_PRODUCTS, CATALOG_LAPTOPS, CATALOG_MOBILES, PRODUCT_DETAIL, PRICE_QUERY, CHEAPEST_PRODUCT, COSTLIEST_PRODUCT, CHEAPEST_LAPTOP, COSTLIEST_LAPTOP, WARRANTY_QUERY, FAQ_QUERY, COMPARISON_QUERY, SHIPPING_QUERY, RETURN_POLICY_QUERY, GREETING, UNKNOWN
  "confidence": 0.0-1.0
}`;

      const chatHistoryFormatted = chatHistory.slice(-5)
        .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
        .join('\n');

      const userPrompt = `Recent Chat History:
${chatHistoryFormatted}

User Query: "${query}"

Provide the normalized standalone search query, the detected intent category, and your confidence score.`;

      const responseText = await GroqService.chatCompletion(systemPrompt, userPrompt, {
        temperature: 0.0,
        responseFormatJson: true
      });

      const parsed = JSON.parse(responseText);
      logger.info(`[QueryNormalizer] Normalized: "${query}" -> "${parsed.normalizedQuery}" (Intent: ${parsed.detectedIntent}, Confidence: ${parsed.confidence})`);
      return {
        normalizedQuery: parsed.normalizedQuery || query,
        detectedIntent: parsed.detectedIntent || 'UNKNOWN',
        confidence: parsed.confidence !== undefined ? Number(parsed.confidence) : 0.90
      };
    } catch (error) {
      logger.error('[QueryNormalizer] Error calling Groq normalizer:', error);
      // Fallback
      return this.normalizeProgrammatically(query, chatHistory, products);
    }
  }

  private static normalizeProgrammatically(
    query: string,
    chatHistory: any[],
    products: any[]
  ): NormalizationResult {
    const qLower = query.toLowerCase().trim().replace(/[?.]/g, '');

    // Extract context from recent history
    let lastProduct = '';
    let lastCategory = '';
    let lastUserQuery = '';

    if (chatHistory && chatHistory.length > 0) {
      const recent = chatHistory.slice(-5);
      const userMsgs = recent.filter(m => m.role === 'user');
      if (userMsgs.length > 0) {
        lastUserQuery = userMsgs[userMsgs.length - 1].content.toLowerCase();
      }

      // Detect last discussed product name dynamically from metadata
      for (const msg of recent) {
        const text = msg.content.toLowerCase();
        for (const p of products) {
          const name = p.product_name.toLowerCase();
          const words = name.split(' ');
          const firstTwo = words.slice(0, 2).join(' ');
          const firstThree = words.slice(0, 3).join(' ');
          if (text.includes(name) || text.includes(firstThree) || text.includes(firstTwo)) {
            lastProduct = p.product_name;
            lastCategory = p.category;
          }
        }
        if (text.includes('laptop') || text.includes('notebook') || text.includes('portable computer')) {
          lastCategory = 'laptop';
        }
        if (text.includes('mobile') || text.includes('phone') || text.includes('smartphone')) {
          lastCategory = 'mobile';
        }
      }
    }

    // Dynamic checks
    const hasLaptopSynonym = this.LAPTOP_SYNONYMS.some(s => qLower.includes(s));
    const hasMobileSynonym = this.MOBILE_SYNONYMS.some(s => qLower.includes(s));
    const hasCheapestSynonym = this.CHEAPEST_SYNONYMS.some(s => qLower.includes(s) || qLower === s.replace(/[?.]/g, ''));
    const hasCostliestSynonym = this.COSTLIEST_SYNONYMS.some(s => qLower.includes(s) || qLower === s.replace(/[?.]/g, ''));

    // 1. Cheapest query ("lowest?", "which one is cheapest?", "least expensive item?", etc.)
    if (hasCheapestSynonym || qLower === 'lowest' || qLower === 'which one is cheapest') {
      const isLaptop = lastCategory.toLowerCase().includes('laptop') || qLower.includes('laptop') || qLower.includes('notebook') || qLower.includes('portable computer');
      if (isLaptop) {
        return {
          normalizedQuery: 'Which laptop has the lowest price?',
          detectedIntent: 'CHEAPEST_LAPTOP',
          confidence: 0.95
        };
      }
      return {
        normalizedQuery: 'What is the cheapest product available?',
        detectedIntent: 'CHEAPEST_PRODUCT',
        confidence: 0.95
      };
    }

    // 2. Costliest query ("highest?", "premium product?", etc.)
    if (hasCostliestSynonym || qLower === 'highest') {
      const isLaptop = lastCategory.toLowerCase().includes('laptop') || qLower.includes('laptop') || qLower.includes('notebook') || qLower.includes('portable computer');
      if (isLaptop) {
        return {
          normalizedQuery: 'Which laptop has the highest price?',
          detectedIntent: 'COSTLIEST_LAPTOP',
          confidence: 0.95
        };
      }
      return {
        normalizedQuery: 'What is the costliest product available?',
        detectedIntent: 'COSTLIEST_PRODUCT',
        confidence: 0.95
      };
    }

    // 3. Follow-up warranty ("what about warranty?")
    if (qLower.includes('warranty') || qLower.includes('guarantee')) {
      if (lastProduct) {
        return {
          normalizedQuery: `What is the warranty of ${lastProduct}?`,
          detectedIntent: 'WARRANTY_QUERY',
          confidence: 0.95
        };
      }
    }

    // 4. Follow-up price ("its price?")
    if (qLower === 'its price' || qLower.includes('its price') || qLower.includes('how much does it cost') || qLower.includes('what is the cost')) {
      if (lastProduct) {
        return {
          normalizedQuery: `What is the price of ${lastProduct}?`,
          detectedIntent: 'PRICE_QUERY',
          confidence: 0.95
        };
      }
    }

    // 5. Catalog laptop ("show notebook computers", "list portable computers", "notebooks")
    if (hasLaptopSynonym) {
      const isCatalog = qLower.includes('show') || qLower.includes('list') || qLower.includes('available') || qLower.includes('all') || qLower.includes('notebook') || qLower.includes('portable') || qLower.trim() === 'laptops' || qLower.trim() === 'notebooks';
      if (isCatalog) {
        return {
          normalizedQuery: 'List all laptops available',
          detectedIntent: 'CATALOG_LAPTOPS',
          confidence: 0.98
        };
      }
    }

    // 6. Catalog mobile
    if (hasMobileSynonym) {
      const isCatalog = qLower.includes('show') || qLower.includes('list') || qLower.includes('available') || qLower.includes('all') || qLower.includes('phone') || qLower.includes('mobile') || qLower.trim() === 'mobiles' || qLower.trim() === 'phones';
      if (isCatalog) {
        return {
          normalizedQuery: 'List all mobile phones available',
          detectedIntent: 'CATALOG_MOBILES',
          confidence: 0.98
        };
      }
    }

    // General fallback mappings based on query
    let intent = 'NORMAL_RAG';
    if (qLower.includes('hi') || qLower.includes('hello') || qLower.includes('hey') || qLower.includes('greetings')) {
      intent = 'GREETING';
    } else if (qLower.includes('shipping') || qLower.includes('delivery')) {
      intent = 'SHIPPING_QUERY';
    } else if (qLower.includes('return') || qLower.includes('refund')) {
      intent = 'RETURN_POLICY_QUERY';
    }

    return {
      normalizedQuery: query,
      detectedIntent: intent,
      confidence: 0.85
    };
  }
}

