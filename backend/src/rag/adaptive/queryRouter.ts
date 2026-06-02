import { MetadataService, ProductMetadata } from '../../services/metadataService';
import { SessionService } from '../../services/session.service';
import { logger } from '../../utils/logger';
import { IntentType, IntentDetector, ProductFilters, extractUnknownCategory, detectCategory } from './intentDetector';

export interface RouterResult {
  handled: boolean;
  answer?: string;
  sourcesUsed?: any[];
  confidenceScore?: number;
  confidenceExplanation?: string;
  whereFilter?: any;
  resolvedProduct?: string;
}

export class QueryRouter {
  public static extractProductName(query: string): string | undefined {
    const qLower = query.toLowerCase();
    const productNames = [
      "Dell XPS 15",
      "HP Spectre x360",
      "Lenovo ThinkPad X1 Carbon",
      "Apple MacBook Pro 16",
      "Asus ROG Zephyrus G16",
      "Acer Predator Helios 16",
      "Samsung Odyssey Neo G9",
      "Sony WH-1000XM5",
      "Logitech MX Keys S",
      "Apple Watch Ultra 2",
      "Bose QuietComfort Ultra Earbuds",
      "Keychron Q1 Pro Keyboard",
      "Razer DeathAdder V3 Pro",
      "Anker Prime 20K Power Bank",
      "DJI Osmo Pocket 3"
    ];
    for (const name of productNames) {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      if (qLower.includes(name.toLowerCase())) return name;
      if (name === "Dell XPS 15" && qLower.includes("dell xps")) return name;
      if (name === "HP Spectre x360" && qLower.includes("hp spectre")) return name;
      if (name === "Lenovo ThinkPad X1 Carbon" && (qLower.includes("thinkpad") || qLower.includes("x1 carbon"))) return name;
      if (name === "Apple MacBook Pro 16" && (qLower.includes("macbook pro") || qLower.includes("macbook"))) return name;
      if (name === "Asus ROG Zephyrus G16" && (qLower.includes("zephyrus") || qLower.includes("rog zephyrus"))) return name;
      if (name === "Acer Predator Helios 16" && (qLower.includes("predator") || qLower.includes("helios"))) return name;
      if (name === "Sony WH-1000XM5" && (qLower.includes("sony") || qLower.includes("wh-1000xm5") || qLower.includes("wh1000xm5"))) return name;
      if (name === "Logitech MX Keys S" && (qLower.includes("logitech") || qLower.includes("mx keys"))) return name;
      if (name === "Apple Watch Ultra 2" && qLower.includes("watch ultra")) return name;
      if (name === "Bose QuietComfort Ultra Earbuds" && (qLower.includes("bose") || qLower.includes("quietcomfort"))) return name;
      if (name === "Keychron Q1 Pro Keyboard" && qLower.includes("keychron")) return name;
      if (name === "Razer DeathAdder V3 Pro" && (qLower.includes("razer") || qLower.includes("deathadder"))) return name;
      if (name === "Anker Prime 20K Power Bank" && (qLower.includes("anker") || qLower.includes("power bank") || qLower.includes("powerbank"))) return name;
      if (name === "DJI Osmo Pocket 3" && (qLower.includes("dji") || qLower.includes("osmo") || qLower.includes("pocket 3"))) return name;
    }
    return undefined;
  }

  private static extractUnknownCategory(query: string): string | undefined {
    return extractUnknownCategory(query);
  }

  public static async route(
    query: string,
    sessionId: string,
    intent: IntentType,
    logDiagnostics: (intent: string, found: number, evaluated: string, filtered: string, selected: string) => void
  ): Promise<RouterResult> {
    logger.info(`[QueryRouter] Routing query with intent: ${intent}`);
    const session = SessionService.getSession(sessionId);
    session.lastIntent = intent;

    const allProducts = MetadataService.getAllProducts();
    const allNames = allProducts.map(p => p.product_name);

    // Save intent history
    session.lastIntent = intent;

    switch (intent) {
      case 'GREETING': {
        const answer = "Hi! I'm your product assistant. You can ask me about products, prices, specs, warranties, or shipping policies.";
        
        logDiagnostics(intent, 0, 'None', 'None', 'None');

        return {
          handled: true,
          answer,
          sourcesUsed: [],
          confidenceScore: 1.0,
          confidenceExplanation: 'Static greeting response.',
          resolvedProduct: 'None'
        };
      }

      case 'PRODUCT_CATALOG': {
        const uniqueNames = Array.from(new Set(allNames)).sort((a, b) => a.localeCompare(b));
        const answer = `Available Products:\n\n${uniqueNames.map(name => `* ${name}`).join('\n')}`;
        
        logDiagnostics(intent, uniqueNames.length, allNames.join(', '), 'None', 'All Products');
        
        return {
          handled: true,
          answer,
          sourcesUsed: [{
            id: 'meta_catalog',
            filename: 'productMetadata.json',
            product_name: 'Catalog Listing',
            collection: 'product_descriptions',
            similarity: 1.0,
            text: 'Loaded complete product catalog from productMetadata.json.'
          }],
          confidenceScore: 1.0,
          confidenceExplanation: 'Grounded directly on static productMetadata.json.',
          resolvedProduct: 'Catalog Listing'
        };
      }

      case 'PRODUCT_PRICE_LIST': {
        const sorted = [...allProducts].sort((a, b) => a.offer_price - b.offer_price);
        const table = MetadataService.formatAsMarkdownTable(sorted);
        const answer = `Here are the prices for all available products:\n\n${table}`;
        
        logDiagnostics(intent, sorted.length, allNames.join(', '), 'None', 'All Prices');

        return {
          handled: true,
          answer,
          sourcesUsed: [{
            id: 'meta_pricelist',
            filename: 'productMetadata.json',
            product_name: 'Price List',
            collection: 'product_descriptions',
            similarity: 1.0,
            text: 'Loaded all product prices from productMetadata.json.'
          }],
          confidenceScore: 1.0,
          confidenceExplanation: 'Grounded directly on static productMetadata.json.',
          resolvedProduct: 'Price List'
        };
      }

      case 'PRODUCT_CHEAPEST': {
        // BUG 2 fix: filter by category if present in query (e.g. "cheapest laptop")
        const detectedCat = detectCategory(query);
        const pool = detectedCat
          ? allProducts.filter(p => p.category.toLowerCase() === detectedCat.toLowerCase())
          : allProducts;

        if (pool.length === 0) {
          const answer = `We don\'t carry any ${detectedCat} in our catalog.\nWe currently offer: Laptops, Keyboards, Mouse, Earbuds, Smartwatch, Monitor, Power Bank, and Camera.`;
          return { handled: true, answer, sourcesUsed: [], confidenceScore: 1.0, confidenceExplanation: 'Unknown category.', resolvedProduct: 'None' };
        }

        const sorted = [...pool].sort((a, b) => a.offer_price - b.offer_price);
        const cheapest = sorted[0];
        const scopeLabel = detectedCat ? `among ${detectedCat}s` : 'overall';
        const answer = `Product Name: ${cheapest.product_name}\nPrice: $${cheapest.offer_price}\nReason: Lowest price item ${scopeLabel}.`;

        const filteredNames = allNames.filter(n => n !== cheapest.product_name);
        logDiagnostics(intent, 1, allNames.join(', '), filteredNames.join(', '), cheapest.product_name);

        return {
          handled: true,
          answer,
          sourcesUsed: [{
            id: `meta_cheapest_${cheapest.product_name}`,
            filename: 'productMetadata.json',
            product_name: cheapest.product_name,
            collection: 'product_descriptions',
            similarity: 1.0,
            text: `Cheapest ${detectedCat || 'product'} resolved to: ${cheapest.product_name} ($${cheapest.offer_price}).`
          }],
          confidenceScore: 1.0,
          confidenceExplanation: `Computed minimum offer price ${scopeLabel} from productMetadata.json.`,
          resolvedProduct: cheapest.product_name
        };
      }

      case 'PRODUCT_COSTLIEST': {
        // BUG 2 fix: filter by category if present in query (e.g. "most expensive laptop")
        const detectedCat = detectCategory(query);
        const pool = detectedCat
          ? allProducts.filter(p => p.category.toLowerCase() === detectedCat.toLowerCase())
          : allProducts;

        if (pool.length === 0) {
          const answer = `We don\'t carry any ${detectedCat} in our catalog.\nWe currently offer: Laptops, Keyboards, Mouse, Earbuds, Smartwatch, Monitor, Power Bank, and Camera.`;
          return { handled: true, answer, sourcesUsed: [], confidenceScore: 1.0, confidenceExplanation: 'Unknown category.', resolvedProduct: 'None' };
        }

        const sorted = [...pool].sort((a, b) => b.offer_price - a.offer_price);
        const costliest = sorted[0];
        const scopeLabel = detectedCat ? `among ${detectedCat}s` : 'overall';
        const answer = `Product Name: ${costliest.product_name}\nPrice: $${costliest.offer_price}\nReason: Highest price item ${scopeLabel}.`;

        const filteredNames = allNames.filter(n => n !== costliest.product_name);
        logDiagnostics(intent, 1, allNames.join(', '), filteredNames.join(', '), costliest.product_name);

        return {
          handled: true,
          answer,
          sourcesUsed: [{
            id: `meta_costliest_${costliest.product_name}`,
            filename: 'productMetadata.json',
            product_name: costliest.product_name,
            collection: 'product_descriptions',
            similarity: 1.0,
            text: `Costliest ${detectedCat || 'product'} resolved to: ${costliest.product_name} ($${costliest.offer_price}).`
          }],
          confidenceScore: 1.0,
          confidenceExplanation: `Computed maximum offer price ${scopeLabel} from productMetadata.json.`,
          resolvedProduct: costliest.product_name
        };
      }

      case 'PRODUCT_PRICE_SINGLE': {
        const name = this.extractProductName(query);
        if (name) {
          const product = MetadataService.getProductByName(name);
          if (product) {
            const answer = `Product Name: ${product.product_name}\nPrice: $${product.offer_price}`;
            
            const filtered = allNames.filter(n => n !== product.product_name);
            logDiagnostics(intent, 1, allNames.join(', '), filtered.join(', '), product.product_name);

            return {
              handled: true,
              answer,
              sourcesUsed: [{
                id: `meta_single_${product.product_name}`,
                filename: 'productMetadata.json',
                product_name: product.product_name,
                collection: 'product_descriptions',
                similarity: 1.0,
                text: `Exact price lookup for ${product.product_name} resolved to $${product.offer_price}.`
              }],
              confidenceScore: 1.0,
              confidenceExplanation: 'Exact product price match from productMetadata.json.',
              resolvedProduct: product.product_name
            };
          }
        }
        
        // Fallback to normal RAG if not found in metadata
        return { handled: false };
      }

      case 'PRODUCT_FILTER': {
        const filters = IntentDetector.extractFilters(query);
        
        const hasUnknownCategory = extractUnknownCategory(query) !== undefined;
        // Carry over category if session has it, query doesn't specify one, and query doesn't specify an unknown category
        if (!filters.category && session.lastFilterCategory && !hasUnknownCategory) {
          filters.category = session.lastFilterCategory;
        }

        let filtered = MetadataService.filterProducts(filters, query, session.lastIntent);
        
        if (hasUnknownCategory) {
          filtered = [];
        }

        if (filters.category) {
          session.lastFilterCategory = filters.category;
        }

        // Handle Zero Results (Bug 4)
        if (filtered.length === 0) {
          if (!filters.category) {
            // Case 1: Unknown Category
            const extractedCategory = this.extractUnknownCategory(query) || "mobiles";
            const answer = `We don't carry any ${extractedCategory} in our catalog.\nWe currently offer: Laptops, Keyboards, Mouse, Earbuds, Smartwatch, Monitor, Power Bank, and Camera.`;
            return {
              handled: true,
              answer,
              sourcesUsed: [],
              confidenceScore: 1.0,
              confidenceExplanation: 'Unknown category queried.'
            };
          } else {
            // Case 3: Price filter too low
            if (filters.price) {
              const limit = filters.price.value;
              const categoryProducts = allProducts.filter(p => p.category.toLowerCase() === filters.category!.toLowerCase());
              if (categoryProducts.length > 0) {
                categoryProducts.sort((a, b) => a.offer_price - b.offer_price);
                const mostAffordable = categoryProducts[0];
                const answer = `No ${filters.category} available under $${limit}.\nOur most affordable ${filters.category} is ${mostAffordable.product_name} at $${mostAffordable.offer_price}.`;
                return {
                  handled: true,
                  answer,
                  sourcesUsed: [],
                  confidenceScore: 1.0,
                  confidenceExplanation: 'Price constraint yielded zero results.'
                };
              }
            }

            // Case 2: Known category, spec too strict
            let tooStrictField: string | undefined = undefined;
            let tooStrictKey: keyof ProductFilters | undefined = undefined;

            if (filters.ram) { tooStrictField = "RAM"; tooStrictKey = "ram"; }
            else if (filters.storage) { tooStrictField = "Storage"; tooStrictKey = "storage"; }
            else if (filters.gpu) { tooStrictField = "GPU"; tooStrictKey = "gpu"; }
            else if (filters.warranty) { tooStrictField = "Warranty"; tooStrictKey = "warranty"; }

            if (tooStrictField && tooStrictKey) {
              const categoryProducts = allProducts.filter(p => p.category.toLowerCase() === filters.category!.toLowerCase());
              const uniqueValues = Array.from(new Set(categoryProducts.map(p => {
                if (tooStrictKey === 'ram') return p.ram;
                if (tooStrictKey === 'storage') return p.storage;
                if (tooStrictKey === 'gpu') return p.gpu;
                if (tooStrictKey === 'warranty') return p.warranty;
                return '';
              })))
              .filter(val => val && val !== 'None')
              .sort();

              const answer = `No ${filters.category} match that specification.\nAvailable ${filters.category} ${tooStrictField} options: ${uniqueValues.join(', ')}.`;
              return {
                handled: true,
                answer,
                sourcesUsed: [],
                confidenceScore: 1.0,
                confidenceExplanation: 'Spec constraint yielded zero results.'
              };
            }

            // Default fallback if category matched but somehow no results and no specs detected
            const answer = `No ${filters.category} match that specification.`;
            return {
              handled: true,
              answer,
              sourcesUsed: [],
              confidenceScore: 1.0,
              confidenceExplanation: 'No products matched category and spec combination.'
            };
          }
        }

        const table = MetadataService.formatAsMarkdownTable(filtered, filters);
        const answer = `Here are the matching products from the catalog:\n\n${table}`;

        const matchingNames = filtered.map(p => p.product_name);
        const excludedNames = allNames.filter(n => !matchingNames.includes(n));

        logDiagnostics(
          intent,
          filtered.length,
          allNames.join(', '),
          excludedNames.length > 0 ? excludedNames.join(', ') : 'None',
          matchingNames.join(', ') || 'None'
        );

        return {
          handled: true,
          answer,
          sourcesUsed: filtered.map(p => ({
            id: `meta_filter_${p.product_name}`,
            filename: 'productMetadata.json',
            product_name: p.product_name,
            collection: 'product_descriptions',
            similarity: 1.0,
            text: `Filtered spec match: Category: ${p.category}, Price: $${p.offer_price}, RAM: ${p.ram}, GPU: ${p.gpu}`
          })),
          confidenceScore: 1.0,
          confidenceExplanation: 'Structured filters computed deterministically on productMetadata.json.',
          resolvedProduct: matchingNames.join(', ') || 'None'
        };
      }

      case 'PRODUCT_DETAIL': {
        const name = this.extractProductName(query);
        if (name) {
          logger.info(`[QueryRouter] Found product detail target: "${name}". Enforcing ChromaDB where filter.`);
          return {
            handled: false,
            whereFilter: { product_name: { $eq: name } },
            resolvedProduct: name
          };
        }
        return { handled: false };
      }

      case 'NORMAL_RAG':
      default:
        return { handled: false };
    }
  }
}
