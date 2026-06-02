import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface ProductMetadata {
  product_name: string;
  category: string;
  price: number;
  offer_price: number;
  warranty: string;
  ram: string;
  storage: string;
  gpu: string;
}

export class MetadataService {
  private static metadataPath = path.join(__dirname, '..', '..', 'data', 'productMetadata.json');
  private static products: ProductMetadata[] = [];

  public static initialize(): void {
    try {
      if (fs.existsSync(this.metadataPath)) {
        const raw = fs.readFileSync(this.metadataPath, 'utf8');
        this.products = JSON.parse(raw);
        logger.info(`MetadataService initialized with ${this.products.length} products.`);
      } else {
        logger.error(`Metadata file not found at: ${this.metadataPath}`);
      }
    } catch (error) {
      logger.error('Failed to initialize MetadataService:', error);
    }
  }

  public static getAllProducts(): ProductMetadata[] {
    if (this.products.length === 0) {
      this.initialize();
    }
    return this.products;
  }

  public static getProductByName(name: string): ProductMetadata | undefined {
    const products = this.getAllProducts();
    const cleanSearchName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return products.find(p => {
      const pNameClean = p.product_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return pNameClean === cleanSearchName || pNameClean.includes(cleanSearchName) || cleanSearchName.includes(pNameClean);
    });
  }

  public static extractCategory(query: string): string | undefined {
    const q = query.toLowerCase();
    if (/\b(laptop|laptops)\b/i.test(q)) return 'laptop';
    if (/\b(monitor|monitors|screen|screens)\b/i.test(q)) return 'monitor';
    if (/\b(headphone|headphones|earbud|earbuds|audio|sound|music)\b/i.test(q)) return 'earbuds';
    if (/\b(keyboard|keyboards)\b/i.test(q)) return 'keyboard';
    if (/\b(mouse|mice)\b/i.test(q)) return 'mouse';
    if (/\b(watch|watches|wearable|wearables|smartwatch|smartwatches)\b/i.test(q)) return 'smartwatch';
    if (/\b(power bank|powerbank|powerbanks|charger|chargers|charging)\b/i.test(q)) return 'powerbank';
    if (/\b(camera|cameras)\b/i.test(q)) return 'camera';
    return undefined;
  }

  public static filterProducts(
    query: string,
    lastCategory?: string | null,
    lastIntent?: string | null,
    explicitCategory?: string | null
  ): { filtered: ProductMetadata[], activeCategory: string | null } {
    const products = this.getAllProducts();
    const qLower = query.toLowerCase();
    let filtered = [...products];
    let activeCategory: string | null = lastCategory || null;

    // 1. Category filter
    let categoryMatched = false;
    let targetCategory = explicitCategory || null;

    if (!targetCategory) {
      targetCategory = this.extractCategory(query) || null;
    }

    if (targetCategory) {
      filtered = filtered.filter(p => p.category.toLowerCase() === targetCategory!.toLowerCase() || p.category.toLowerCase().includes(targetCategory!.toLowerCase()));
      activeCategory = targetCategory;
      categoryMatched = true;
    }

    // Carry over category if not matched in the current query but exists in session
    if (!categoryMatched && activeCategory) {
      // Temporarily check if category filtering leaves any matches
      const categoryFiltered = filtered.filter(p => p.category.toLowerCase().includes(activeCategory!.toLowerCase()));
      
      // Also apply price limits to see if the combination yields any results
      const underMatch = qLower.match(/(?:under|below|less than|cheaper than|cost under|price under)\s*\$?\s*(\d+)/i) || qLower.match(/<\s*\$?\s*(\d+)/i);
      const overMatch = qLower.match(/(?:over|above|more than|cost over|price over)\s*\$?\s*(\d+)/i) || qLower.match(/>\s*\$?\s*(\d+)/i);
      let finalFilteredTemp = [...categoryFiltered];
      if (underMatch) {
        const limit = parseFloat(underMatch[1]);
        finalFilteredTemp = finalFilteredTemp.filter(p => p.offer_price < limit);
      }
      if (overMatch) {
        const limit = parseFloat(overMatch[1]);
        finalFilteredTemp = finalFilteredTemp.filter(p => p.offer_price > limit);
      }

      if (finalFilteredTemp.length > 0) {
        filtered = categoryFiltered;
      } else {
        // Reset category context since combining with the category yields no results
        activeCategory = null;
      }
    }

    // 2. RAM filter
    const ramMatch = qLower.match(/(\d+)\s*gb/i);
    if (ramMatch && qLower.includes('ram')) {
      const ramLimit = parseInt(ramMatch[1], 10);
      filtered = filtered.filter(p => {
        const parsedRam = parseInt(p.ram.replace(/[^0-9]/g, ''), 10);
        return !isNaN(parsedRam) && parsedRam >= ramLimit;
      });
    }

    // 3. GPU filter
    if (qLower.includes('rtx') || qLower.includes('nvidia') || qLower.includes('gpu') || qLower.includes('graphics')) {
      let gpuSearch = '';
      if (qLower.includes('rtx')) gpuSearch = 'rtx';
      else if (qLower.includes('nvidia')) gpuSearch = 'nvidia';
      else if (qLower.includes('arc')) gpuSearch = 'arc';
      else if (qLower.includes('iris')) gpuSearch = 'iris';
      else if (qLower.includes('graphics') || qLower.includes('gpu')) gpuSearch = 'gpu';

      if (gpuSearch) {
        filtered = filtered.filter(p => p.gpu && p.gpu.toLowerCase().includes(gpuSearch));
      }
    }

    // 4. Price Limit filter (offer_price)
    const underMatch = qLower.match(/(?:under|below|less than|cheaper than|cost under|price under)\s*\$?\s*(\d+)/i) || qLower.match(/<\s*\$?\s*(\d+)/i);
    const overMatch = qLower.match(/(?:over|above|more than|cost over|price over)\s*\$?\s*(\d+)/i) || qLower.match(/>\s*\$?\s*(\d+)/i);

    if (underMatch) {
      const limit = parseFloat(underMatch[1]);
      filtered = filtered.filter(p => p.offer_price < limit);
    }
    if (overMatch) {
      const limit = parseFloat(overMatch[1]);
      filtered = filtered.filter(p => p.offer_price > limit);
    }

    // 5. Cheapest / Costliest constraint sub-filtering inside Filter
    const isCheapest = /\b(cheapest|lowest price|least expensive|cheapest cost|lowest cost|minimum price|lowest priced|cheapest of all)\b/i.test(qLower) || lastIntent === 'PRODUCT_CHEAPEST';
    const isCostliest = /\b(most expensive|highest price|costliest|highest cost|maximum price|most priced|highest priced|costliest product|costliest item|most expensive product)\b/i.test(qLower) || lastIntent === 'PRODUCT_COSTLIEST';

    if (isCheapest && filtered.length > 0) {
      filtered.sort((a, b) => a.offer_price - b.offer_price);
      const minPrice = filtered[0].offer_price;
      filtered = filtered.filter(p => p.offer_price === minPrice);
    } else if (isCostliest && filtered.length > 0) {
      filtered.sort((a, b) => b.offer_price - a.offer_price);
      const maxPrice = filtered[0].offer_price;
      filtered = filtered.filter(p => p.offer_price === maxPrice);
    }

    return { filtered, activeCategory };
  }

  public static formatAsMarkdownTable(products: ProductMetadata[]): string {
    if (products.length === 0) {
      return "No matching products found in the catalog.";
    }

    // Generate column headers depending on presence of specifications (some products have RAM/GPU, others don't)
    const hasSpecs = products.some(p => p.ram !== 'None' || p.gpu !== 'None' || p.storage !== 'None');

    if (hasSpecs) {
      let table = "Product | Price | RAM | Storage | GPU | Warranty\n---|---|---|---|---|---\n";
      for (const p of products) {
        table += `${p.product_name} | $${p.offer_price} | ${p.ram} | ${p.storage} | ${p.gpu} | ${p.warranty}\n`;
      }
      return table;
    } else {
      let table = "Product | Price | Warranty\n---|---|---\n";
      for (const p of products) {
        table += `${p.product_name} | $${p.offer_price} | ${p.warranty}\n`;
      }
      return table;
    }
  }
}
