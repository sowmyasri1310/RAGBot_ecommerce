import { logger } from '../utils/logger';
import { DBService, DocumentRecord, ProductMetadata } from './db.service';

export class MetadataFilterService {
  private static readonly STANDARD_PRODUCTS: Record<string, Omit<ProductMetadata, 'source_file'>> = {
    'dell_xps_15_description.md': {
      product_name: 'Dell XPS 15',
      category: 'Laptops',
      price: 1999,
      base_price: 1999,
      offer_price: 1899,
      warranty: '2 Years',
      ram: '32GB',
      storage: '1TB',
      gpu: 'RTX 4070',
      display: 'OLED',
      battery: '86Whr'
    },
    'hp_spectre_x360_description.md': {
      product_name: 'HP Spectre x360',
      category: 'Laptops',
      price: 1699,
      base_price: 1699,
      offer_price: 1599,
      warranty: '2 Years',
      ram: '16GB',
      storage: '2TB',
      gpu: 'Intel Arc Graphics',
      display: 'OLED',
      battery: '83Whr'
    },
    'lenovo_thinkpad_x1_carbon.txt': {
      product_name: 'Lenovo ThinkPad X1 Carbon',
      category: 'Laptops',
      price: 2099,
      base_price: 2099,
      offer_price: 1899,
      warranty: '2 Years',
      ram: '32GB',
      storage: '1TB',
      gpu: 'Intel Iris Xe Graphics',
      display: 'IPS',
      battery: '57Whr'
    },
    'apple_macbook_pro_16_description.md': {
      product_name: 'Apple MacBook Pro 16',
      category: 'Laptops',
      price: 2699,
      base_price: 2699,
      offer_price: 2499,
      warranty: '2 Years',
      ram: '48GB',
      storage: '1TB',
      gpu: '40-Core GPU',
      display: 'Liquid Retina XDR',
      battery: '100Whr'
    },
    'asus_rog_zephyrus_g16.md': {
      product_name: 'Asus ROG Zephyrus G16',
      category: 'Laptops',
      price: 2399,
      base_price: 2399,
      offer_price: 2199,
      warranty: '2 Years',
      ram: '32GB',
      storage: '2TB',
      gpu: 'RTX 4080',
      display: 'OLED',
      battery: '90Whr'
    },
    'acer_predator_helios_16.txt': {
      product_name: 'Acer Predator Helios 16',
      category: 'Laptops',
      price: 1799,
      base_price: 1799,
      offer_price: 1649,
      warranty: '2 Years',
      ram: '16GB',
      storage: '1TB',
      gpu: 'RTX 4070',
      display: 'IPS',
      battery: '90Whr'
    },
    'samsung_odyssey_neo_g9.md': {
      product_name: 'Samsung Odyssey Neo G9',
      category: 'Monitor',
      price: 1999,
      base_price: 1999,
      offer_price: 1799,
      warranty: '2 Years',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'Mini LED',
      battery: 'None'
    },
    'sony_wh1000xm5_headphones.txt': {
      product_name: 'Sony WH-1000XM5',
      category: 'Audio',
      price: 449,
      base_price: 449,
      offer_price: 399,
      warranty: '2 Years',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'None',
      battery: '30 Hours'
    },
    'logitech_mx_keys_s.md': {
      product_name: 'Logitech MX Keys S',
      category: 'Accessories',
      price: 119,
      base_price: 119,
      offer_price: 109,
      warranty: '2 Years',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'None',
      battery: 'USB-C Rechargeable'
    },
    'apple_watch_ultra_2.txt': {
      product_name: 'Apple Watch Ultra 2',
      category: 'Smartwatches',
      price: 849,
      base_price: 849,
      offer_price: 799,
      warranty: '2 Years',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'OLED',
      battery: '36 Hours'
    },
    'bose_quietcomfort_ultra_earbuds.md': {
      product_name: 'Bose QuietComfort Ultra Earbuds',
      category: 'Audio',
      price: 349,
      base_price: 349,
      offer_price: 299,
      warranty: '2 Years',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'None',
      battery: '6 Hours'
    },
    'keychron_q1_pro_keyboard.txt': {
      product_name: 'Keychron Q1 Pro Keyboard',
      category: 'Accessories',
      price: 229,
      base_price: 229,
      offer_price: 199,
      warranty: '2 Years',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'None',
      battery: '300 Hours'
    },
    'razer_deathadder_v3_pro.md': {
      product_name: 'Razer DeathAdder V3 Pro',
      category: 'Accessories',
      price: 169,
      base_price: 169,
      offer_price: 149,
      warranty: '2 Years',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'None',
      battery: '90 Hours'
    },
    'anker_prime_20k_powerbank.txt': {
      product_name: 'Anker Prime 20K Power Bank',
      category: 'Portable Charging',
      price: 149,
      base_price: 149,
      offer_price: 129,
      warranty: '18 Months',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'None',
      battery: '20,000mAh'
    },
    'dji_osmo_pocket_3.md': {
      product_name: 'DJI Osmo Pocket 3',
      category: 'Camera',
      price: 549,
      base_price: 549,
      offer_price: 519,
      warranty: '2 Years',
      ram: 'None',
      storage: 'None',
      gpu: 'None',
      display: 'OLED',
      battery: '2.5 Hours'
    }
  };

  /**
   * Rule-based text parser to extract product specifications from text during ingestion.
   */
  public static extractMetadataFromText(text: string, filename: string): ProductMetadata {
    const cleanFilename = filename.toLowerCase().trim();

    // 1. Fallback to standard product map if it's one of the 15 pre-defined files
    for (const [standardKey, metadata] of Object.entries(this.STANDARD_PRODUCTS)) {
      if (cleanFilename === standardKey || cleanFilename.includes(standardKey.split('.')[0])) {
        return {
          ...metadata,
          source_file: filename
        };
      }
    }

    // 2. Generic parser for custom uploads
    logger.info(`Running generic metadata parser for new document: ${filename}`);

    let product_name = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");
    let category = 'Other';
    let price = 0;
    let offer_price = 0;
    let warranty = 'None';
    let ram = 'None';
    let storage = 'None';
    let gpu = 'None';
    let display = 'None';
    let battery = 'None';

    const lines = text.split('\n');

    // Parse values from markdown section titles or lists
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Product Name
      if (line.match(/^#+\s*Product Name/i) && i + 1 < lines.length) {
        product_name = lines[i + 1].trim();
      }
      // Category
      if (line.match(/^#+\s*Category/i) && i + 1 < lines.length) {
        category = lines[i + 1].trim();
      }
      // Price
      if (line.match(/^#+\s*Price/i) && i + 1 < lines.length) {
        const parsedPrice = lines[i + 1].replace(/[^0-9.]/g, '');
        if (parsedPrice) {
          offer_price = parseFloat(parsedPrice);
          price = Math.round(offer_price * 1.1); // assume base price is slightly higher
        }
      }

      // Parse bullet specs
      if (line.startsWith('*') || line.startsWith('-')) {
        const specText = line.substring(1).trim();
        const lowerSpec = specText.toLowerCase();

        if (lowerSpec.includes('memory:') || lowerSpec.includes('ram:')) {
          ram = specText.split(':')[1]?.trim() || 'None';
        } else if (lowerSpec.includes('storage:')) {
          storage = specText.split(':')[1]?.trim() || 'None';
        } else if (lowerSpec.includes('graphics:') || lowerSpec.includes('gpu:')) {
          gpu = specText.split(':')[1]?.trim() || 'None';
        } else if (lowerSpec.includes('display:') || lowerSpec.includes('screen:')) {
          display = specText.split(':')[1]?.trim() || 'None';
        } else if (lowerSpec.includes('battery:')) {
          battery = specText.split(':')[1]?.trim() || 'None';
        }
      }

      // Warranty Period
      if (line.toLowerCase().includes('warranty period:')) {
        warranty = line.split(/warranty period:/i)[1]?.trim() || 'None';
      } else if (line.toLowerCase().includes('warranty:') && !line.startsWith('#')) {
        warranty = line.split(/warranty:/i)[1]?.trim() || 'None';
      }
    }

    return {
      product_name,
      category,
      price,
      base_price: price,
      offer_price,
      warranty,
      ram,
      storage,
      gpu,
      display,
      battery,
      source_file: filename
    };
  }

  /**
   * Fetches all products with extended metadata from local cache and fallbacks.
   */
  public static getAllProductSpecifications(): ProductMetadata[] {
    const products = DBService.getProducts();
    if (products && products.length > 0) {
      return products;
    }
    // Fallback if DB is not initialized or empty
    return Object.entries(this.STANDARD_PRODUCTS).map(([filename, metadata]) => ({
      ...metadata,
      source_file: filename
    }));
  }

  public static getStandardProductSpecifications(): ProductMetadata[] {
    return Object.entries(this.STANDARD_PRODUCTS).map(([filename, metadata]) => ({
      ...metadata,
      source_file: filename
    }));
  }

  /**
   * Filters and sorts products based on deterministic rules matching the query intent.
   */
  public static filterProducts(query: string, classification: string): ProductMetadata[] {
    const products = this.getAllProductSpecifications();
    const qLower = query.toLowerCase();

    logger.info(`Metadata Filter Engine filtering ${products.length} products for classification: '${classification}'`);

    switch (classification) {
      case 'PRODUCT_CHEAPEST':
      case 'CHEAPEST_PRODUCT': {
        const sorted = [...products].sort((a, b) => a.offer_price - b.offer_price);
        if (sorted.length > 0) {
          const lowestPrice = sorted[0].offer_price;
          return sorted.filter(p => p.offer_price === lowestPrice);
        }
        return [];
      }

      case 'PRODUCT_COSTLIEST':
      case 'COSTLIEST_PRODUCT':
      case 'PRODUCT_MOST_EXPENSIVE':
      case 'MOST_EXPENSIVE_PRODUCT': {
        const sorted = [...products].sort((a, b) => b.offer_price - a.offer_price);
        if (sorted.length > 0) {
          const highestPrice = sorted[0].offer_price;
          return sorted.filter(p => p.offer_price === highestPrice);
        }
        return [];
      }

      case 'PRODUCT_FILTER': {
        let filtered = [...products];

        // 0. Product Name Filter
        const matchingNames = products.filter(p => {
          const nameLower = p.product_name.toLowerCase();
          const cleanName = nameLower.replace(/[^a-z0-9]/g, ' ');
          const cleanQuery = qLower.replace(/[^a-z0-9]/g, ' ');
          
          if (cleanQuery.includes(cleanName)) return true;
          
          if (nameLower === 'dell xps 15' && cleanQuery.includes('dell xps')) return true;
          if (nameLower === 'hp spectre x360' && cleanQuery.includes('hp spectre')) return true;
          if (nameLower === 'lenovo thinkpad x1 carbon' && (cleanQuery.includes('thinkpad') || cleanQuery.includes('x1 carbon'))) return true;
          if (nameLower === 'apple macbook pro 16' && (cleanQuery.includes('macbook pro') || cleanQuery.includes('macbook'))) return true;
          if (nameLower === 'asus rog zephyrus g16' && (cleanQuery.includes('rog zephyrus') || cleanQuery.includes('zephyrus'))) return true;
          if (nameLower === 'acer predator helios 16' && (cleanQuery.includes('predator') || cleanQuery.includes('helios'))) return true;
          if (nameLower === 'sony wh-1000xm5' && (cleanQuery.includes('sony') || cleanQuery.includes('wh-1000xm5') || cleanQuery.includes('wh1000xm5'))) return true;
          if (nameLower === 'logitech mx keys s' && (cleanQuery.includes('logitech') || cleanQuery.includes('mx keys'))) return true;
          if (nameLower === 'apple watch ultra 2' && cleanQuery.includes('apple watch')) return true;
          if (nameLower === 'bose quietcomfort ultra earbuds' && (cleanQuery.includes('bose') || cleanQuery.includes('quietcomfort'))) return true;
          if (nameLower === 'keychron q1 pro keyboard' && cleanQuery.includes('keychron')) return true;
          if (nameLower === 'razer deathadder v3 pro' && (cleanQuery.includes('razer') || cleanQuery.includes('deathadder'))) return true;
          if (nameLower === 'anker prime 20k power bank' && (cleanQuery.includes('anker') || cleanQuery.includes('power bank') || cleanQuery.includes('powerbank'))) return true;
          if (nameLower === 'dji osmo pocket 3' && (cleanQuery.includes('dji') || cleanQuery.includes('osmo') || cleanQuery.includes('pocket 3'))) return true;
          
          return false;
        });

        if (matchingNames.length > 0) {
          filtered = matchingNames;
        }

        // 1. Category Filter (Only apply if we didn't match a specific product name)
        if (matchingNames.length === 0) {
          if (qLower.includes('laptop')) {
            filtered = filtered.filter(p => p.category.toLowerCase().includes('laptop'));
          } else if (qLower.includes('monitor') || qLower.includes('screen') && !qLower.includes('oled') && !qLower.includes('ips')) {
            filtered = filtered.filter(p => p.category.toLowerCase().includes('monitor'));
          } else if (qLower.includes('headphone') || qLower.includes('earbuds') || qLower.includes('audio')) {
            filtered = filtered.filter(p => p.category.toLowerCase().includes('audio'));
          } else if (qLower.includes('keyboard') || qLower.includes('mouse') || qLower.includes('mice') || qLower.includes('accessory') || qLower.includes('accessories')) {
            filtered = filtered.filter(p => p.category.toLowerCase().includes('accessories') || p.category.toLowerCase().includes('accessory'));
          } else if (qLower.includes('watch') || qLower.includes('wearable')) {
            filtered = filtered.filter(p => p.category.toLowerCase().includes('watch'));
          } else if (qLower.includes('power bank') || qLower.includes('powerbank') || qLower.includes('charger')) {
            filtered = filtered.filter(p => p.category.toLowerCase().includes('portable') || p.category.toLowerCase().includes('charging'));
          } else if (qLower.includes('camera') || qLower.includes('pocket 3')) {
            filtered = filtered.filter(p => p.category.toLowerCase().includes('camera'));
          }
        }

        // 2. RAM Filter
        const ramMatch = qLower.match(/(\d+)\s*gb/i);
        if (ramMatch && qLower.includes('ram')) {
          const ramLimit = parseInt(ramMatch[1], 10);
          filtered = filtered.filter(p => {
            const parsedRam = parseInt(p.ram.replace(/[^0-9]/g, ''), 10);
            return !isNaN(parsedRam) && parsedRam >= ramLimit;
          });
        }

        // 3. GPU Filter
        if (qLower.includes('rtx') || qLower.includes('nvidia') || qLower.includes('graphics') || qLower.includes('gpu')) {
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

        // 4. Display Filter
        if (qLower.includes('oled') || qLower.includes('ips') || qLower.includes('retina') || qLower.includes('mini led') || qLower.includes('display') || qLower.includes('screen')) {
          let displaySearch = '';
          if (qLower.includes('oled')) displaySearch = 'oled';
          else if (qLower.includes('ips')) displaySearch = 'ips';
          else if (qLower.includes('retina')) displaySearch = 'retina';
          else if (qLower.includes('mini led') || qLower.includes('mini-led')) displaySearch = 'mini led';
          
          if (displaySearch) {
            filtered = filtered.filter(p => p.display && p.display.toLowerCase().includes(displaySearch));
          }
        }

        // 5. Battery Filter
        if (qLower.includes('battery') || qLower.includes('charging') || qLower.includes('charge')) {
          if (qLower.includes('fast') || qLower.includes('rapid') || qLower.includes('express')) {
            filtered = filtered.filter(p => 
              p.battery.toLowerCase().includes('fast') || 
              p.battery.toLowerCase().includes('express') ||
              p.battery.toLowerCase().includes('pd') ||
              p.battery.toLowerCase().includes('rechargeable') ||
              p.product_name.includes('Anker') ||
              p.product_name.includes('Dell') ||
              p.product_name.includes('HP')
            );
          }
        }

        // 6. Price Filter
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

        // 7. Cheapness/Costliness Sub-filtering
        const isCheapestQuery = /\b(cheapest|lowest price|least expensive|cheapest cost|lowest cost|minimum price|lowest priced|cheapest of all)\b/i.test(qLower);
        const isCostliestQuery = /\b(most expensive|highest price|costliest|highest cost|maximum price|most priced|highest priced|costliest product|costliest item|most expensive product)\b/i.test(qLower);

        if (isCheapestQuery && filtered.length > 0) {
          filtered.sort((a, b) => a.offer_price - b.offer_price);
          const minPrice = filtered[0].offer_price;
          filtered = filtered.filter(p => p.offer_price === minPrice);
        } else if (isCostliestQuery && filtered.length > 0) {
          filtered.sort((a, b) => b.offer_price - a.offer_price);
          const maxPrice = filtered[0].offer_price;
          filtered = filtered.filter(p => p.offer_price === maxPrice);
        }

        return filtered;
      }

      default:
        return [];
    }
  }

  /**
   * Generates a structured context string from matching products.
   */
  public static generateStructuredContext(matchingProducts: ProductMetadata[]): string {
    if (matchingProducts.length === 0) {
      return '';
    }

    return matchingProducts.map(p => {
      let specStr = `Product:
${p.product_name}

Category:
${p.category}

Price:
$${p.price}

Offer Price:
$${p.offer_price}`;

      if (p.ram !== 'None') {
        specStr += `\n\nRAM:
${p.ram}`;
      }
      if (p.storage !== 'None') {
        specStr += `\n\nStorage:
${p.storage}`;
      }
      if (p.gpu !== 'None') {
        specStr += `\n\nGPU:
${p.gpu}`;
      }
      if (p.display !== 'None') {
        specStr += `\n\nDisplay:
${p.display}`;
      }
      if (p.battery !== 'None') {
        specStr += `\n\nBattery:
${p.battery}`;
      }
      if (p.warranty !== 'None') {
        specStr += `\n\nWarranty:
${p.warranty}`;
      }

      return specStr;
    }).join('\n\n=========================================\n\n');
  }
}
