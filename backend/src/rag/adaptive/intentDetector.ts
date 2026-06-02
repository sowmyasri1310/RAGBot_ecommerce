import { GroqService } from '../../services/groq.service';
import { SessionService } from '../../services/session.service';
import { logger } from '../../utils/logger';

export type IntentType =
  | 'GREETING'
  | 'PRODUCT_CATALOG'
  | 'PRODUCT_PRICE_LIST'
  | 'PRODUCT_CHEAPEST'
  | 'PRODUCT_COSTLIEST'
  | 'PRODUCT_FILTER'
  | 'PRODUCT_DETAIL'
  | 'PRODUCT_PRICE_SINGLE'
  | 'NORMAL_RAG';

export interface SpecFilter<T> {
  op: "eq" | "gte" | "lte";
  value: T;
}

export interface ProductFilters {
  category?: string;
  ram?: SpecFilter<number>;
  storage?: SpecFilter<number>;
  price?: SpecFilter<number>;
  gpu?: string;
  warranty?: SpecFilter<number>;
}

export const categoryAliasMap: Record<string, string[]> = {
  "laptop": ["laptop", "laptops", "notebook", "notebooks"],
  "keyboard": ["keyboard", "keyboards"],
  "mouse": ["mouse", "mouses", "mice", "gaming mouse"],
  "earbuds": ["earbuds", "earbud", "headphones", "headphone", "earphones", "earphone"],
  "smartwatch": ["smartwatch", "smartwatches", "watch", "watches"],
  "monitor": ["monitor", "monitors", "display", "displays", "screen"],
  "powerbank": ["powerbank", "power bank", "power banks", "portable charger", "charger"],
  "camera": ["camera", "cameras", "action camera", "pocket camera"]
};

export function detectCategory(query: string): string | undefined {
  const q = query.toLowerCase();
  for (const [category, aliases] of Object.entries(categoryAliasMap)) {
    for (const alias of aliases) {
      const escapedAlias = alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedAlias}\\b`, 'i');
      if (regex.test(q)) {
        return category;
      }
    }
  }
  return undefined;
}

export function detectOperator(query: string, matchIndex: number, matchedStr: string): "eq" | "gte" | "lte" {
  const preText = query.substring(0, matchIndex).trim().toLowerCase();
  const postText = query.substring(matchIndex + matchedStr.length).trim().toLowerCase();

  const gtePatterns = [
    /\b(at least|minimum|or more|more than|above)\b\s*$/i,
    /\b(at least|minimum|or more|more than|above)\b\s+\w+\s*$/i,
    /\b(at least|minimum|or more|more than|above)\b\s+\w+\s+\w+\s*$/i
  ];
  const ltePatterns = [
    /\b(under|less than|below|at most|maximum|cheaper than)\b\s*$/i,
    /\b(under|less than|below|at most|maximum|cheaper than)\b\s+\w+\s*$/i,
    /\b(under|less than|below|at most|maximum|cheaper than)\b\s+\w+\s+\w+\s*$/i
  ];
  const eqPatterns = [
    /\b(only|exactly|just)\b\s*$/i,
    /\b(only|exactly|just)\b\s+\w+\s*$/i,
    /\b(only|exactly|just)\b\s+\w+\s+\w+\s*$/i
  ];

  for (const pattern of gtePatterns) {
    if (pattern.test(preText)) return "gte";
  }
  for (const pattern of ltePatterns) {
    if (pattern.test(preText)) return "lte";
  }
  for (const pattern of eqPatterns) {
    if (pattern.test(preText)) return "eq";
  }

  if (/^\s*(or\s+more|or\s+above)\b/i.test(postText)) return "gte";
  if (/^\s*(or\s+less|or\s+below)\b/i.test(postText)) return "lte";

  return "eq";
}

export function extractUnknownCategory(query: string): string | undefined {
  const q = query.toLowerCase();
  
  // Look for common electronic category patterns
  const patterns = [
    /\b(?:list|show|display|search|find|any|all)\s+(?:all\s+)?([a-zA-Z]{3,})\b/i,
    /\b([a-zA-Z]{3,})\s+(?:under|above|below|with|at|under|over|available)\b/i
  ];

  for (const pattern of patterns) {
    const match = q.match(pattern);
    if (match) {
      const word = match[1];
      const stopWords = ["products", "prices", "items", "cost", "only", "cheapest", "costliest", "under", "least", "most", "exactly", "specs", "details"];
      if (!detectCategory(word) && !stopWords.includes(word)) {
        return word;
      }
    }
  }

  const commonUnknown = ["mobiles", "mobile", "tablets", "tablet", "tvs", "tv", "phones", "phone", "televisions", "television"];
  for (const word of commonUnknown) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(q) && !detectCategory(word)) {
      return word;
    }
  }

  return undefined;
}

export class IntentDetector {
  public static async detect(query: string, sessionId: string): Promise<IntentType> {
    const q = query.toLowerCase().trim().replace(/[?.]/g, '');
    logger.info(`[IntentDetector] Detecting intent for: "${query}" in session "${sessionId}"`);

    // BUG 3 — Greetings return "I don't have that information"
    const greetingKeywords = /^\s*(hi|hello|hey|greetings|good morning|good afternoon|good evening|yo)\b/i;
    if (greetingKeywords.test(q)) {
      logger.info(`[IntentDetector] Greeting detected. Routing to GREETING`);
      return 'GREETING';
    }

    // BUG 2 — Multi-product comparison or comparison keywords
    const comparisonKeywords = /\b(compare|vs|versus|difference between|differences between)\b/i;
    const productMatchers = [
      /\b(dell|xps)\b/i,
      /\b(hp|spectre)\b/i,
      /\b(lenovo|thinkpad|x1 carbon)\b/i,
      /\b(macbook|apple macbook)\b/i,
      /\b(asus|zephyrus|rog zephyrus)\b/i,
      /\b(acer|predator|helios)\b/i,
      /\b(samsung|odyssey|neo g9)\b/i,
      /\b(sony|wh-1000xm5|wh1000xm5)\b/i,
      /\b(logitech|mx keys)\b/i,
      /\b(watch ultra|apple watch)\b/i,
      /\b(bose|quietcomfort)\b/i,
      /\b(keychron|q1 pro)\b/i,
      /\b(razer|deathadder)\b/i,
      /\b(anker|power bank|powerbank)\b/i,
      /\b(dji|osmo|pocket 3)\b/i
    ];
    
    let matchedProductsCount = 0;
    for (const matcher of productMatchers) {
      if (matcher.test(q)) {
        matchedProductsCount++;
      }
    }

    if (comparisonKeywords.test(q) || matchedProductsCount >= 2) {
      logger.info(`[IntentDetector] Comparison keyword or 2+ products detected (${matchedProductsCount}). Routing to NORMAL_RAG.`);
      return 'NORMAL_RAG';
    }

    // Define keywords
    const catalogKeywords = /\b(what products are available|what's available|list all products|show all products|what products do you have|display product catalog|display catalog|available items|list products|available products|what all products|show available products|products do you have|products are in the catalog|list of products|show products)\b/i;
    const priceListKeywords = /\b(show all prices|price list|give prices for all products|prices of all products|show prices|what are the prices)\b/i;
    
    const filterKeywords = /\b(ram|memory|rtx|nvidia|gpu|graphics|intel arc|iris xe|graphics card|oled|ips|liquid retina|retina xdr|display|screen|resolution|curved|battery|charging|fast charge|fast charging|recharging|expresscharge|rapid charge|battery life|battery hours)\b/i;
    
    const cheapestKeywords = /\b(cheapest|lowest price|least expensive|cheapest cost|lowest cost|minimum price|lowest priced|cheapest of all)\b/i;
    const costliestKeywords = /\b(most expensive|highest price|costliest|highest cost|maximum price|most priced|highest priced|costliest product|costliest item|most expensive product)\b/i;
    const priceLimitKeywords = /\b(under|below|less than|above|more than|over|between|\$)\b/i;
    
    const priceKeywords = /\b(price|cost|pricing|how much|value|worth)\b/i;
    const detailKeywords = /\b(tell me about|describe|details|show details|specs|specification|features|overview|info|about|what is)\b/i;

    const productNames = [
      'dell', 'xps', 'spectre', 'macbook', 'zephyrus', 'predator', 'helios', 'thinkpad', 'lenovo',
      'sony', 'wh-1000xm5', 'wh1000xm5', 'bose', 'quietcomfort', 'apple watch', 'watch ultra',
      'dji', 'osmo', 'pocket 3', 'logitech', 'mx keys', 'keychron', 'q1 pro', 'razer', 'deathadder',
      'samsung', 'odyssey', 'anker prime', 'anker'
    ];
    
    const mentionsSpecificProduct = productNames.some(pName => q.includes(pName));
    const hasCategory = detectCategory(query) !== undefined;
    const hasFilter = filterKeywords.test(q);
    const hasPriceLimit = priceLimitKeywords.test(q) || /\b\d+\s*gb\b/i.test(q) || /\b\d+\s*hour\b/i.test(q);

    // BUG 1 & 2 — Recommendation queries checks
    const recommendationKeywords = /\b(best|suggest|recommend|which one should|which is better|good for|suitable for|budget friendly|worth buying|which one)\b/i;
    const isRecommendation = recommendationKeywords.test(q);

    if (isRecommendation && (hasCategory || mentionsSpecificProduct)) {
      logger.info(`[IntentDetector] Recommendation query detected. Routing to NORMAL_RAG.`);
      return 'NORMAL_RAG';
    }

    // Detect if unknown category listing/filtering is queried
    const hasUnknownCategory = extractUnknownCategory(query) !== undefined;
    if (hasUnknownCategory && (catalogKeywords.test(q) || /list|show|display|any|all|under|below|above|price|cost|cheapest|costliest/i.test(q))) {
      logger.info(`[IntentDetector] Unknown category detected in filter query. Routing to PRODUCT_FILTER.`);
      return 'PRODUCT_FILTER';
    }

    // Handle follow-up correction context (Gap 2)
    const isCorrection = /^(but\s+that|no\s+that|that\s+is\s+not|actually|instead|sorry|no\b)/i.test(q);
    const session = SessionService.getSession(sessionId);

    if (isCorrection && session.lastIntent) {
      if (['PRODUCT_CHEAPEST', 'PRODUCT_COSTLIEST', 'PRODUCT_FILTER'].includes(session.lastIntent)) {
        logger.info(`[IntentDetector] Follow-up correction detected. Restoring last metadata intent: PRODUCT_FILTER`);
        return 'PRODUCT_FILTER';
      }
    }

    // 1. PRODUCT_CATALOG
    if ((catalogKeywords.test(q) || q === 'products' || q === 'catalog') && !hasCategory) {
      return 'PRODUCT_CATALOG';
    }

    // 2. PRODUCT_PRICE_LIST
    if (priceListKeywords.test(q)) {
      return 'PRODUCT_PRICE_LIST';
    }

    // 3. PRODUCT_PRICE_SINGLE (specific product name AND price/cost keywords)
    if (mentionsSpecificProduct && priceKeywords.test(q)) {
      if (!(hasCategory && (cheapestKeywords.test(q) || hasPriceLimit))) {
        return 'PRODUCT_PRICE_SINGLE';
      }
    }

    // 4. PRODUCT_DETAIL (specific product name AND detail keywords)
    if (mentionsSpecificProduct && detailKeywords.test(q)) {
      return 'PRODUCT_DETAIL';
    }

    // 5. PRODUCT_FILTER (Category / specs / price limit / constraints) (BUG 1)
    if (hasCategory || hasFilter || hasPriceLimit || mentionsSpecificProduct) {
      if (cheapestKeywords.test(q) || costliestKeywords.test(q) || priceLimitKeywords.test(q) || hasFilter || hasCategory) {
        return 'PRODUCT_FILTER';
      }
    }

    // 6. PRODUCT_CHEAPEST (Overall cheapest)
    if (cheapestKeywords.test(q)) {
      return 'PRODUCT_CHEAPEST';
    }

    // 7. PRODUCT_COSTLIEST (Overall costliest)
    if (costliestKeywords.test(q)) {
      return 'PRODUCT_COSTLIEST';
    }

    // 8. Fallback to LLM Classification
    try {
      logger.info('[IntentDetector] Falling back to LLM intent classification...');
      const systemPrompt = `You are a query classifier for an e-commerce assistant.
Classify the user's query into exactly one of the following intents:
- GREETING (e.g. hi, hello, hey, good morning)
- PRODUCT_CATALOG (e.g. show product list, what products are available)
- PRODUCT_PRICE_LIST (e.g. show prices of all items)
- PRODUCT_CHEAPEST (e.g. lowest price item overall)
- PRODUCT_COSTLIEST (e.g. most expensive product overall)
- PRODUCT_FILTER (e.g. laptops under $500, products with 16GB RAM)
- PRODUCT_DETAIL (e.g. tell me about Dell XPS 15, HP Spectre specs)
- PRODUCT_PRICE_SINGLE (e.g. price of Dell XPS 15, cost of DJI Osmo)
- NORMAL_RAG (e.g. FAQs, returns policy, warranty info, general product comparisons)

Return ONLY the intent name. No other text, no explanation.`;

      const response = await GroqService.chatCompletion(systemPrompt, `Query: "${query}"`, {
        temperature: 0.0
      });

      const detected = response.trim().toUpperCase() as IntentType;
      const validIntents: IntentType[] = [
        'GREETING',
        'PRODUCT_CATALOG',
        'PRODUCT_PRICE_LIST',
        'PRODUCT_CHEAPEST',
        'PRODUCT_COSTLIEST',
        'PRODUCT_FILTER',
        'PRODUCT_DETAIL',
        'PRODUCT_PRICE_SINGLE',
        'NORMAL_RAG'
      ];

      if (validIntents.includes(detected)) {
        logger.info(`[IntentDetector] LLM classified intent as: ${detected}`);
        if (detected === 'PRODUCT_CATALOG' && detectCategory(query) !== undefined) {
          return 'PRODUCT_FILTER';
        }
        return detected;
      }
    } catch (err) {
      logger.error('[IntentDetector] LLM fallback failed:', err);
    }

    return 'NORMAL_RAG';
  }

  public static extractFilters(query: string): ProductFilters {
    const filters: ProductFilters = {};
    const q = query.toLowerCase();

    const category = detectCategory(query);
    if (category) {
      filters.category = category;
    }

    const ramMatch = query.match(/(\d+)\s*gb\s*ram/i);
    if (ramMatch) {
      const val = parseInt(ramMatch[1], 10);
      const op = detectOperator(query, ramMatch.index!, ramMatch[0]);
      filters.ram = { op, value: val };
    }

    const storageRegex = /(\d+)\s*(tb|gb)\s*(ssd|storage|hdd)?/gi;
    let match;
    while ((match = storageRegex.exec(query)) !== null) {
      const matchStr = match[0];
      const matchIndex = match.index;
      
      const overlapsRam = ramMatch &&
        ramMatch.index !== undefined &&
        matchIndex >= ramMatch.index &&
        matchIndex < ramMatch.index + ramMatch[0].length;
      
      if (!overlapsRam) {
        let val = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (unit === 'tb') {
          val = val * 1024;
        }
        const op = detectOperator(query, matchIndex, matchStr);
        filters.storage = { op, value: val };
        break;
      }
    }

    const priceMatch = query.match(/\$(\d+)/i) || query.match(/(\d+)\s*dollars/i);
    if (priceMatch) {
      const val = parseInt(priceMatch[1], 10);
      const op = detectOperator(query, priceMatch.index!, priceMatch[0]);
      filters.price = { op, value: val };
    }

    const gpuKeywords = ["RTX", "GTX", "Intel Arc", "Intel Iris", "NVIDIA", "AMD", "40-Core"];
    for (const kw of gpuKeywords) {
      const regex = new RegExp(kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      if (regex.test(query)) {
        filters.gpu = kw;
        break;
      }
    }

    const warrantyMatch = query.match(/(\d+)\s*year/i);
    if (warrantyMatch) {
      const val = parseInt(warrantyMatch[1], 10);
      const op = detectOperator(query, warrantyMatch.index!, warrantyMatch[0]);
      filters.warranty = { op, value: val };
    }

    return filters;
  }
}
