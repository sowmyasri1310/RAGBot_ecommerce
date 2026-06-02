import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { ProductFilters, SpecFilter, detectCategory } from '../rag/adaptive/intentDetector';

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
    return detectCategory(query);
  }

  public static filterProducts(
    filters: ProductFilters,
    query: string,
    lastIntent?: string | null
  ): ProductMetadata[] {
    const products = this.getAllProducts();
    let filtered = [...products];

    // 1. Category filter
    if (filters.category) {
      filtered = filtered.filter(p => p.category.toLowerCase() === filters.category!.toLowerCase());
    }

    // Helper to evaluate spec filter
    const evalSpec = (productVal: number, filter: SpecFilter<number>): boolean => {
      if (filter.op === "eq") return productVal === filter.value;
      if (filter.op === "gte") return productVal >= filter.value;
      if (filter.op === "lte") return productVal <= filter.value;
      return false;
    };

    // 2. RAM filter
    if (filters.ram) {
      filtered = filtered.filter(p => {
        const pRam = parseInt(p.ram.replace(/[^0-9]/g, ''), 10);
        if (isNaN(pRam)) return false;
        return evalSpec(pRam, filters.ram!);
      });
    }

    // 3. Storage filter
    if (filters.storage) {
      filtered = filtered.filter(p => {
        let pStorage = 0;
        const valMatch = p.storage.match(/(\d+)\s*(tb|gb)/i);
        if (valMatch) {
          pStorage = parseInt(valMatch[1], 10);
          if (valMatch[2].toLowerCase() === 'tb') {
            pStorage *= 1024;
          }
        } else {
          return false;
        }
        return evalSpec(pStorage, filters.storage!);
      });
    }

    // 4. GPU filter
    if (filters.gpu) {
      filtered = filtered.filter(p => {
        if (!p.gpu || p.gpu === 'None') return false;
        return p.gpu.toLowerCase().includes(filters.gpu!.toLowerCase());
      });
    }

    // 5. Price filter
    if (filters.price) {
      filtered = filtered.filter(p => {
        return evalSpec(p.offer_price, filters.price!);
      });
    }

    // 6. Warranty filter
    if (filters.warranty) {
      filtered = filtered.filter(p => {
        let pWarrantyYears = 0;
        const yearsMatch = p.warranty.match(/(\d+)\s*year/i);
        const monthsMatch = p.warranty.match(/(\d+)\s*month/i);
        if (yearsMatch) {
          pWarrantyYears = parseInt(yearsMatch[1], 10);
        } else if (monthsMatch) {
          pWarrantyYears = parseInt(monthsMatch[1], 10) / 12;
        } else {
          return false;
        }
        return evalSpec(pWarrantyYears, filters.warranty!);
      });
    }

    // 7. Cheapest / Costliest constraint sub-filtering
    const qLower = query.toLowerCase();
    const isCheapest = /\b(cheapest|lowest price|least expensive|cheapest cost|lowest cost|minimum price|lowest priced|cheapest of all)\b/i.test(qLower) || lastIntent === 'PRODUCT_CHEAPEST';
    const isCostliest = /\b(most expensive|highest price|costliest|highest cost|maximum price|most priced|highest priced|costliest product|costliest item|most expensive product)\b/i.test(qLower) || lastIntent === 'PRODUCT_COSTLIEST';

    if (isCheapest && filtered.length > 0) {
      filtered.sort((a, b) => a.offer_price - b.offer_price);
      filtered = [filtered[0]];
    } else if (isCostliest && filtered.length > 0) {
      filtered.sort((a, b) => b.offer_price - a.offer_price);
      filtered = [filtered[0]];
    }

    return filtered;
  }

  public static formatAsMarkdownTable(products: ProductMetadata[], filters: ProductFilters = {}): string {
    if (products.length === 0) {
      return "No matching products found in the catalog.";
    }

    const filterKeys = Object.keys(filters).filter(k => k !== 'category') as (keyof ProductFilters)[];

    const hasRam = products.some(p => p.ram !== 'None');
    const hasStorage = products.some(p => p.storage !== 'None');
    const hasGpu = products.some(p => p.gpu !== 'None');

    const availableCols: string[] = ["price"];
    if (hasRam || filters.ram) availableCols.push("ram");
    if (hasStorage || filters.storage) availableCols.push("storage");
    if (hasGpu || filters.gpu) availableCols.push("gpu");
    availableCols.push("warranty");

    const orderedCols: string[] = [];
    for (const key of filterKeys) {
      const colName = key.toLowerCase();
      if (availableCols.includes(colName)) {
        orderedCols.push(colName);
      }
    }
    for (const col of availableCols) {
      if (!orderedCols.includes(col)) {
        orderedCols.push(col);
      }
    }

    const colDisplayName: Record<string, string> = {
      product: "Product",
      price: "Price",
      ram: "RAM",
      storage: "Storage",
      gpu: "GPU",
      warranty: "Warranty"
    };

    let header = "Product | " + orderedCols.map(c => colDisplayName[c]).join(" | ") + "\n";
    let separator = "---| " + orderedCols.map(() => "---").join(" | ") + "\n";
    let table = header + separator;

    const formatValue = (p: ProductMetadata, col: string): string => {
      if (col === 'price') return `$${p.offer_price}`;
      if (col === 'ram') return p.ram;
      if (col === 'storage') return p.storage;
      if (col === 'gpu') return p.gpu;
      if (col === 'warranty') return p.warranty;
      return '';
    };

    for (const p of products) {
      table += `${p.product_name} | ` + orderedCols.map(c => formatValue(p, c)).join(" | ") + "\n";
    }

    return table;
  }
}
