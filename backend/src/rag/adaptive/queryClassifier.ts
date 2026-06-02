import { GroqService } from '../../services/groq.service';
import { logger } from '../../utils/logger';

export interface ClassificationResult {
  classification: 
    | 'PRODUCT_CATALOG'
    | 'PRODUCT_DETAIL'
    | 'PRODUCT_COMPARISON'
    | 'PRODUCT_RECOMMENDATION'
    | 'PRICE_QUERY'
    | 'PRICE_COMPARISON'
    | 'CHEAPEST_PRODUCT'
    | 'MOST_EXPENSIVE_PRODUCT'
    | 'RAM_FILTER'
    | 'GPU_FILTER'
    | 'DISPLAY_FILTER'
    | 'BATTERY_FILTER'
    | 'WARRANTY_QUERY'
    | 'RETURN_POLICY_QUERY'
    | 'FAQ_QUERY';
  confidence: number; // between 0.0 and 1.0
  rationale: string;
}

export class QueryClassifier {
  /**
   * Helper pattern matcher to immediately and accurately route catalog and listing queries.
   */
  private static isCatalogQuery(q: string): boolean {
    const lower = q.toLowerCase().trim().replace(/[?.]/g, '');
    return (
      lower.includes('what products are available') ||
      lower.includes('what are all products available') ||
      lower.includes('what all products are available') ||
      lower.includes('list all products') ||
      lower.includes('show all products') ||
      lower.includes('what products do you have') ||
      lower.includes('display product catalog') ||
      lower.includes('display catalog') ||
      lower.includes('available items') ||
      lower.includes('list products') ||
      lower.includes('available products') ||
      lower.includes('what all products') ||
      lower.includes('show available products') ||
      lower.includes('products do you have') ||
      lower.includes('products are in the catalog') ||
      lower === 'products' ||
      lower === 'catalog' ||
      lower.includes('list of products') ||
      lower.includes('show products')
    );
  }

  private static isProductDetailQuery(q: string): boolean {
    const lower = q.toLowerCase().trim().replace(/[?.]/g, '');
    const productKeywords = [
      // Laptops
      'dell', 'xps', 'hp spectre', 'spectre x360', 'spectre', 'macbook', 'mac book',
      'zephyrus', 'rog zephyrus', 'acer', 'predator', 'helios',
      'thinkpad', 'lenovo',
      // Audio
      'sony', 'wh-1000xm5', 'wh1000xm5', 'bose', 'quietcomfort',
      // Wearables & Camera
      'apple watch', 'watch ultra', 'dji', 'osmo', 'pocket 3',
      // Peripherals
      'logitech', 'mx keys', 'keychron', 'q1 pro',
      'razer', 'deathadder',
      // Monitor & Power
      'samsung odyssey', 'odyssey neo', 'odyssey',
      'anker prime', 'anker',
      // Catch-all for multi-word product names mentioned partially
      'samsung', 'logitech mx'
    ];
    
    const mentionsProduct = productKeywords.some(keyword => lower.includes(keyword));
    if (!mentionsProduct) return false;

    // Check if it is a catalog query
    if (this.isCatalogQuery(q)) return false;

    const compareKeywords = ['compare', 'vs', 'versus', 'difference between', 'comparison'];
    const isComparison = compareKeywords.some(kw => lower.includes(kw));
    if (isComparison) return false;

    // Guard: if 2 or more distinct catalog products are mentioned, let the LLM
    // classify it (likely PRODUCT_COMPARE, not a single-product detail query)
    const catalogProductNames = [
      'dell xps', 'hp spectre', 'apple macbook', 'macbook pro', 'asus rog', 'zephyrus',
      'acer predator', 'predator helios', 'lenovo thinkpad', 'thinkpad x1',
      'sony wh', 'wh-1000xm5', 'bose quietcomfort', 'quietcomfort ultra',
      'apple watch ultra', 'dji osmo', 'logitech mx', 'mx keys',
      'keychron q1', 'razer deathadder', 'samsung odyssey', 'odyssey neo',
      'anker prime'
    ];
    const distinctProductMatches = catalogProductNames.filter(p => lower.includes(p));
    if (distinctProductMatches.length >= 2) return false;

    // If it contains detail indicators
    const detailPhrases = [
      'tell me about', 'describe', 'details', 'show details', 'specs',
      'specification', 'features', 'overview', 'info', 'about', 'what is'
    ];
    
    return detailPhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Classifies user queries using Groq API and structured JSON outputs.
   */
  public static async classify(query: string): Promise<ClassificationResult> {
    const q = query.toLowerCase().trim().replace(/[?.]/g, '');
    logger.info(`Running deterministic query classifier on: "${query}"`);

    // 1. CHEAPEST_PRODUCT
    if (/\b(cheapest|lowest price|least expensive|cheapest cost|lowest cost|minimum price|cheapest product|cheapest item|lowest priced|cheapest of all)\b/i.test(q)) {
      return {
        classification: 'CHEAPEST_PRODUCT',
        confidence: 1.0,
        rationale: 'Deterministic match for cheapest product query.'
      };
    }

    // 2. MOST_EXPENSIVE_PRODUCT
    if (/\b(most expensive|highest price|costliest|highest cost|maximum price|most priced|highest priced|costliest product|costliest item|most expensive product)\b/i.test(q)) {
      return {
        classification: 'MOST_EXPENSIVE_PRODUCT',
        confidence: 1.0,
        rationale: 'Deterministic match for most expensive product query.'
      };
    }

    // 3. RAM_FILTER
    if (/\b(ram|memory)\b/i.test(q)) {
      if (/\b\d+\s*gb\b/i.test(q) || /laptops have/i.test(q) || /support/i.test(q) || /with/i.test(q) || /has/i.test(q) || /have/i.test(q)) {
        return {
          classification: 'RAM_FILTER',
          confidence: 1.0,
          rationale: 'Deterministic match for RAM filter query.'
        };
      }
    }

    // 4. GPU_FILTER
    if (/\b(rtx|nvidia|gpu|graphics|intel arc|iris xe|graphics card)\b/i.test(q)) {
      if (/\b(rtx|nvidia|intel arc|iris xe)\b/i.test(q) || /support/i.test(q) || /with/i.test(q) || /has/i.test(q) || /have/i.test(q) || /features/i.test(q)) {
        return {
          classification: 'GPU_FILTER',
          confidence: 1.0,
          rationale: 'Deterministic match for GPU filter query.'
        };
      }
    }

    // 5. DISPLAY_FILTER
    if (/\b(oled|ips|liquid retina|retina xdr|display|screen|resolution|curved|monitor)\b/i.test(q)) {
      if (/\b(oled|ips|liquid retina|retina xdr|curved)\b/i.test(q) || /support/i.test(q) || /with/i.test(q) || /has/i.test(q) || /have/i.test(q)) {
        return {
          classification: 'DISPLAY_FILTER',
          confidence: 1.0,
          rationale: 'Deterministic match for display filter query.'
        };
      }
    }

    // 6. BATTERY_FILTER
    if (/\b(battery|charging|fast charge|fast charging|recharging|expresscharge|rapid charge|battery life|battery hours)\b/i.test(q)) {
      if (/support/i.test(q) || /with/i.test(q) || /has/i.test(q) || /have/i.test(q) || /hours/i.test(q)) {
        return {
          classification: 'BATTERY_FILTER',
          confidence: 1.0,
          rationale: 'Deterministic match for battery filter query.'
        };
      }
    }

    // 7. WARRANTY_QUERY
    if (/\b(warranty|guarantee)\b/i.test(q)) {
      return {
        classification: 'WARRANTY_QUERY',
        confidence: 1.0,
        rationale: 'Deterministic match for warranty query.'
      };
    }

    // 8. PRICE_QUERY (e.g. under $500, price filter)
    if (/\b(price|cost|costing|priced)\b/i.test(q) || /\$/i.test(q) || /\b(under|below|less than|above|more than|over|between)\b/i.test(q)) {
      if (/\b\d+\b/i.test(q)) {
        return {
          classification: 'PRICE_QUERY',
          confidence: 1.0,
          rationale: 'Deterministic match for price filter/query.'
        };
      }
    }

    // 9. PRICE_COMPARISON
    if (/\b(price|cost|prices|costs)\b/i.test(q)) {
      if (/\b(all|compare|list|for each|every|difference|vs|versus)\b/i.test(q)) {
        return {
          classification: 'PRICE_COMPARISON',
          confidence: 1.0,
          rationale: 'Deterministic match for price comparison query.'
        };
      }
    }

    // 10. PRODUCT_COMPARISON
    if (/\b(compare|comparison|vs|versus|difference between|differ)\b/i.test(q)) {
      return {
        classification: 'PRODUCT_COMPARISON',
        confidence: 1.0,
        rationale: 'Deterministic match for product comparison query.'
      };
    }

    // 11. PRODUCT_RECOMMENDATION
    if (/\b(recommend|recommendation|best|suggest|suitable|advise|for travel|for gaming|for video editing)\b/i.test(q)) {
      return {
        classification: 'PRODUCT_RECOMMENDATION',
        confidence: 1.0,
        rationale: 'Deterministic match for product recommendation query.'
      };
    }

    // 12. PRODUCT_CATALOG
    if (this.isCatalogQuery(query)) {
      return {
        classification: 'PRODUCT_CATALOG',
        confidence: 1.0,
        rationale: 'Deterministic match for product catalog listing query.'
      };
    }

    // 13. RETURN_POLICY_QUERY
    if (/\b(return|refund|policy|restocking|fee|return window|return policy)\b/i.test(q)) {
      return {
        classification: 'RETURN_POLICY_QUERY',
        confidence: 1.0,
        rationale: 'Deterministic match for return policy query.'
      };
    }

    // 14. PRODUCT_DETAIL
    if (this.isProductDetailQuery(query)) {
      return {
        classification: 'PRODUCT_DETAIL',
        confidence: 1.0,
        rationale: 'Deterministic match for product detail query.'
      };
    }

    // 15. FAQ_QUERY
    return {
      classification: 'FAQ_QUERY',
      confidence: 1.0,
      rationale: 'Default FAQ query fallback.'
    };
  }
}
