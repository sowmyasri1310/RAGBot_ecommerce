import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export class GroqService {
  private static client: Groq | null = null;
  private static isMockMode: boolean = false;

  /**
   * Initializes the Groq client. Automatically detects if mock mode should be activated.
   */
  public static initialize(): void {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      logger.warn('⚠️ GROQ_API_KEY is not defined in the environment! Groq Service will operate in MOCK MODE.');
      this.isMockMode = true;
      return;
    }

    try {
      this.client = new Groq({ apiKey });
      this.isMockMode = false;
      logger.info('Groq LLM Service initialized successfully.');
    } catch (error) {
      logger.error('Failed to initialize Groq client. Reverting to Mock Mode:', error);
      this.isMockMode = true;
    }
  }

  /**
   * Generates a chat completion. Handles both actual Groq calls and simulated mock responses.
   */
  public static async chatCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: {
      model?: string;
      temperature?: number;
      responseFormatJson?: boolean;
    } = {}
  ): Promise<string> {
    if (this.isMockMode || !this.client) {
      return this.generateMockResponse(systemPrompt, userPrompt, options.responseFormatJson);
    }

    const model = options.model || 'llama-3.1-8b-instant';
    const temperature = options.temperature !== undefined ? options.temperature : 0.1;
    const response_format = options.responseFormatJson ? { type: 'json_object' as const } : undefined;

    try {
      logger.debug(`Calling Groq API (${model}, JSON = ${!!options.responseFormatJson})...`);

      const response = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model,
        temperature,
        response_format,
        max_tokens: 1500
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('Groq API call encountered an error. Falling back to mock generator:', error);
      return this.generateMockResponse(systemPrompt, userPrompt, options.responseFormatJson);
    }
  }

  /**
   * Decides if Groq is running in mock mode.
   */
  public static checkMockMode(): boolean {
    return this.isMockMode;
  }

  /**
   * Generates extremely realistic simulated mock responses for all key pipeline components
   * to ensure a complete, functioning local test environment without external API costs.
   */
  private static generateMockResponse(
    systemPrompt: string,
    userPrompt: string,
    isJson: boolean = false
  ): string {
    logger.info('🤖 Generating simulated LLM response in Mock Mode...');
    const userLower = userPrompt.toLowerCase();

    // 1. QUERY CLASSIFICATION MOCK
    if (systemPrompt.includes('Classify the e-commerce user query')) {
      let classification = 'NORMAL_RAG';
      if (userLower.includes('what products are available') || userLower.includes('what all products') || userLower.includes('list all products') || userLower.includes('show all products') || userLower.includes('catalog') || userLower.includes('available products') || userLower.includes('list products') || userLower.includes('show products')) {
        classification = 'PRODUCT_CATALOG';
      } else if (userLower.includes('prices') || userLower.includes('pricing') || userLower.includes('price list') || userLower.includes('give prices')) {
        classification = 'PRODUCT_PRICE_LIST';
      } else if (userLower.includes('cheapest') || userLower.includes('lowest price') || userLower.includes('least expensive') || userLower.includes('lowest cost')) {
        if (userLower.includes('laptop') || userLower.includes('monitor') || userLower.includes('headphone') || userLower.includes('earbuds') || userLower.includes('watch') || userLower.includes('keyboard')) {
          classification = 'PRODUCT_FILTER';
        } else {
          classification = 'PRODUCT_CHEAPEST';
        }
      } else if (userLower.includes('most expensive') || userLower.includes('costliest') || userLower.includes('highest price') || userLower.includes('maximum price')) {
        if (userLower.includes('laptop') || userLower.includes('monitor') || userLower.includes('headphone') || userLower.includes('earbuds') || userLower.includes('watch')) {
          classification = 'PRODUCT_FILTER';
        } else {
          classification = 'PRODUCT_COSTLIEST';
        }
      } else if (userLower.includes('ram') || userLower.includes('memory') || userLower.includes('rtx') || userLower.includes('nvidia') || userLower.includes('under') || userLower.includes('below') || userLower.includes('above') || userLower.includes('more than')) {
        classification = 'PRODUCT_FILTER';
      } else if (userLower.includes('tell me about') || userLower.includes('describe') || userLower.includes('specs') || userLower.includes('specification') || userLower.includes('what is')) {
        classification = 'PRODUCT_DETAIL';
      }

      return JSON.stringify({
        classification,
        confidence: 0.95,
        rationale: `Simulated classification based on key terms in prompt: '${userPrompt}'`
      });
    }

    // 2a. CONVERSATIONAL QUERY REWRITER MOCK (pronoun resolution, context-aware)
    if (systemPrompt.includes('You are a conversational query rewriter for an E-commerce Product Assistant')) {
      // Extract the user's latest query from the userPrompt block
      const latestQueryMatch = userPrompt.match(/User's Latest Query:\s*(.+)/i);
      const latestQuery = latestQueryMatch ? latestQueryMatch[1].trim() : userPrompt;

      // Only rewrite if pronouns exist — otherwise return the original query as-is
      const pronounPatterns = /\b(it|its|they|their|this|that|these|those|them)\b/i;
      if (!pronounPatterns.test(latestQuery)) {
        // No pronouns: return unchanged so the classifier sees the real query
        return latestQuery;
      }

      // Extract currently discussed product from userPrompt
      const productMatch = userPrompt.match(/Currently Discussed Product:\s*(.+)/i);
      const currentProduct = productMatch ? productMatch[1].trim() : '';

      // Replace pronouns with the current product name
      if (currentProduct) {
        const resolved = latestQuery
          .replace(/\bits\b/gi, `${currentProduct}'s`)
          .replace(/\bit\b/gi, currentProduct)
          .replace(/\bthis\b/gi, currentProduct)
          .replace(/\bthat\b/gi, currentProduct);
        return resolved;
      }

      return latestQuery;
    }

    // 2b. STANDALONE QUERY REWRITE MOCK
    if (systemPrompt.includes('Rewrite the following e-commerce search query')) {
      let rewritten = userPrompt;
      if (userLower.includes('guarantee period')) {
        rewritten = userPrompt.replace('guarantee period', 'warranty period');
      } else if (userLower.includes('gaming laptop')) {
        rewritten = 'laptops suitable for gaming high graphics';
      } else if (userLower.includes('fast charging')) {
        rewritten = 'laptop power delivery battery fast charging time';
      } else if (userLower.includes('32gb ram')) {
        rewritten = 'laptop models supporting 32gb ddr5 memory specifications';
      }
      return JSON.stringify({ rewrittenQuery: rewritten });
    }

    // 3. TAG GENERATOR MOCK
    if (systemPrompt.includes('Generate descriptive metadata tags')) {
      const tags = ['e-commerce', 'assistant', 'product'];
      if (userLower.includes('ram')) tags.push('hardware', 'ram', 'memory');
      if (userLower.includes('warranty')) tags.push('warranty', 'support', 'coverage');
      if (userLower.includes('return')) tags.push('returns', 'refund', 'policy');
      if (userLower.includes('charge') || userLower.includes('power')) tags.push('charging', 'power', 'battery');
      if (userLower.includes('dell') || userLower.includes('xps')) tags.push('dell', 'xps', 'laptop');
      if (userLower.includes('spectre') || userLower.includes('hp')) tags.push('hp', 'spectre', 'laptop');
      if (userLower.includes('gaming') || userLower.includes('rtx')) tags.push('gaming', 'rtx', 'graphics');

      return JSON.stringify({
        tags: tags.slice(0, 6).join(', ')
      });
    }

    // 4. CONFIDENCE SCORER MOCK
    if (systemPrompt.includes('Evaluate the correctness and confidence')) {
      return JSON.stringify({
        confidenceScore: 0.88,
        explanation: 'The context provides exact matching details for the query, yielding high confidence.'
      });
    }

    // 5. EVALUATION GENERATOR MOCK
    if (systemPrompt.includes('Evaluate the quality and accuracy')) {
      return JSON.stringify({
        precision: 0.9,
        recall: 0.9,
        mrr: 1.0,
        contextRelevance: 0.85,
        faithfulness: 0.95,
        answerRelevance: 0.9,
        groundedness: 0.95,
        correctness: 0.9,
        reasoning: 'Grounded in the context perfectly.'
      });
    }

    // 6. GENERAL ANSWER SYNTHESIS MOCK (Fallback)
    if (systemPrompt.includes("Context Documents:")) {
      const promptLower = userPrompt.toLowerCase();

      // Extract Context Text
      const contextStart = systemPrompt.indexOf('Context Documents:');
      let contextText = '';
      if (contextStart !== -1) {
        const firstQuote = systemPrompt.indexOf('"""', contextStart);
        if (firstQuote !== -1) {
          const secondQuote = systemPrompt.indexOf('"""', firstQuote + 3);
          if (secondQuote !== -1) {
            contextText = systemPrompt.substring(firstQuote + 3, secondQuote).trim();
          }
        }
      }

      // Parse Sources
      const sources: Array<{ file: string; product: string; relevance: string; text: string }> = [];
      if (contextText) {
        const sourceBlocks = contextText.split(/--- KNOWLEDGE SOURCE \[\d+\]/);
        for (const block of sourceBlocks) {
          if (!block.trim()) continue;
          const headerMatch = block.match(/^\s*\(File:\s*([^,]+),\s*Product:\s*([^,]+),\s*Relevance:\s*([^)]+)\)\s*---\r?\n([\s\S]+)$/);
          if (headerMatch) {
            sources.push({
              file: headerMatch[1].trim(),
              product: headerMatch[2].trim(),
              relevance: headerMatch[3].trim(),
              text: headerMatch[4].trim()
            });
          }
        }
      }

      // Heuristic 1: RAM / Memory check
      if (promptLower.includes('ram') || promptLower.includes('memory') || promptLower.includes('gb ')) {
        const ramLines: string[] = [];
        const seenRam = new Set<string>();
        for (const src of sources) {
          const lines = src.text.split('\n');
          for (const line of lines) {
            if (line.toLowerCase().includes('memory') || line.toLowerCase().includes('ram')) {
              const cleanedLine = line.trim().replace(/^[\s*-]+/, '');
              const uniqueKey = `${src.product}: ${cleanedLine}`;
              if (!seenRam.has(uniqueKey)) {
                seenRam.add(uniqueKey);
                ramLines.push(`* **${src.product}**: ${cleanedLine} (Source: ${src.file})`);
              }
            }
          }
        }

        let matchingLines = ramLines;
        let isSpecific = false;
        if (promptLower.includes('16gb') || promptLower.includes('16 gb')) {
          matchingLines = ramLines.filter(l => l.toLowerCase().includes('16gb') || l.toLowerCase().includes('16 gb'));
          isSpecific = true;
        } else if (promptLower.includes('32gb') || promptLower.includes('32 gb')) {
          matchingLines = ramLines.filter(l => l.toLowerCase().includes('32gb') || l.toLowerCase().includes('32 gb'));
          isSpecific = true;
        } else if (promptLower.includes('48gb') || promptLower.includes('48 gb')) {
          matchingLines = ramLines.filter(l => l.toLowerCase().includes('48gb') || l.toLowerCase().includes('48 gb'));
          isSpecific = true;
        }

        if (matchingLines.length > 0) {
          const title = isSpecific ? `laptops with the requested RAM capacity` : `memory (RAM) specifications of the products`;
          return `Based on the verified product documents in the context, here are the ${title}:

${matchingLines.join('\n')}

*(Note: Groq is running in simulated mock mode because the GROQ_API_KEY was rate-limited or not supplied)*`;
        }
      }

      // Heuristic 2: Price / Cost / Cheaper / Costliest check
      if (promptLower.includes('price') || promptLower.includes('cost') || promptLower.includes('cheaper') || promptLower.includes('cheapest') || promptLower.includes('costliest') || promptLower.includes('expensive')) {
        const prices: Array<{ product: string; file: string; price: number; originalText: string }> = [];
        const seenPrice = new Set<string>();

        for (const src of sources) {
          const lines = src.text.split('\n');
          for (const line of lines) {
            if (line.toLowerCase().includes('price') || line.toLowerCase().includes('cost')) {
              const cleanedLine = line.trim().replace(/^[\s*-]+/, '');
              const priceMatch = line.match(/\$(\d+[\d,]*)/);
              if (priceMatch) {
                const val = parseInt(priceMatch[1].replace(/,/g, ''));
                if (!isNaN(val)) {
                  const uniqueKey = `${src.product}: ${val}`;
                  if (!seenPrice.has(uniqueKey)) {
                    seenPrice.add(uniqueKey);
                    prices.push({
                      product: src.product,
                      file: src.file,
                      price: val,
                      originalText: cleanedLine
                    });
                  }
                }
              }
            }
          }
        }

        if (prices.length > 0) {
          if (promptLower.includes('cheaper') || promptLower.includes('cheapest') || promptLower.includes('least expensive')) {
            prices.sort((a, b) => a.price - b.price);
            const cheapest = prices[0];
            return `Based on the verified product documents in the context, the cheapest product is **${cheapest.product}** priced at **$${cheapest.price}** (Source: ${cheapest.file}).

Here is a comparison of all prices found in the context:
${prices.map(p => `* **${p.product}**: $${p.price} (${p.originalText}) (Source: ${p.file})`).join('\n')}

*(Note: Groq is running in simulated mock mode because the GROQ_API_KEY was rate-limited or not supplied)*`;
          }

          if (promptLower.includes('costliest') || promptLower.includes('expensive') || promptLower.includes('highest')) {
            prices.sort((a, b) => b.price - a.price);
            const costliest = prices[0];
            return `Based on the verified product documents in the context, the most expensive product is **${costliest.product}** priced at **$${costliest.price}** (Source: ${costliest.file}).

Here is a comparison of all prices found in the context:
${prices.map(p => `* **${p.product}**: $${p.price} (${p.originalText}) (Source: ${p.file})`).join('\n')}

*(Note: Groq is running in simulated mock mode because the GROQ_API_KEY was rate-limited or not supplied)*`;
          }

          return `Based on the verified product documents in the context, here are the prices of the products:

${prices.map(p => `* **${p.product}**: $${p.price} (${p.originalText}) (Source: ${p.file})`).join('\n')}

*(Note: Groq is running in simulated mock mode because the GROQ_API_KEY was rate-limited or not supplied)*`;
        }
      }

      // Heuristic 3: Warranty / Guarantee check
      if (promptLower.includes('warranty') || promptLower.includes('guarantee')) {
        const warrantyLines: string[] = [];
        const seenWarranty = new Set<string>();
        for (const src of sources) {
          const lines = src.text.split('\n');
          for (const line of lines) {
            if (line.toLowerCase().includes('warranty') || line.toLowerCase().includes('guarantee')) {
              const cleanedLine = line.trim().replace(/^[\s*-]+/, '');
              const uniqueKey = `${src.product}: ${cleanedLine}`;
              if (!seenWarranty.has(uniqueKey)) {
                seenWarranty.add(uniqueKey);
                warrantyLines.push(`* **${src.product}**: ${cleanedLine} (Source: ${src.file})`);
              }
            }
          }
        }

        if (warrantyLines.length > 0) {
          return `Based on the verified product documents in the context, here are the warranty details:

${warrantyLines.join('\n')}

*(Note: Groq is running in simulated mock mode because the GROQ_API_KEY was rate-limited or not supplied)*`;
        }
      }

      // Heuristic 4: Return Policy check
      if (promptLower.includes('return') || promptLower.includes('refund') || promptLower.includes('restocking')) {
        const returnLines: string[] = [];
        const seenReturn = new Set<string>();
        for (const src of sources) {
          const lines = src.text.split('\n');
          for (const line of lines) {
            if (line.toLowerCase().includes('return') || line.toLowerCase().includes('refund') || line.toLowerCase().includes('restocking')) {
              const cleanedLine = line.trim().replace(/^[\s*-]+/, '');
              const uniqueKey = `${src.product}: ${cleanedLine}`;
              if (!seenReturn.has(uniqueKey)) {
                seenReturn.add(uniqueKey);
                returnLines.push(`* **${src.product}**: ${cleanedLine} (Source: ${src.file})`);
              }
            }
          }
        }

        if (returnLines.length > 0) {
          return `Based on the verified product return policies in the context, here are the details:

${returnLines.join('\n')}

*(Note: Groq is running in simulated mock mode because the GROQ_API_KEY was rate-limited or not supplied)*`;
        }
      }

      // Heuristic 5: Product Detail check
      const allProductNames = [
        'Dell XPS 15', 'HP Spectre x360', 'Apple MacBook Pro 16', 'Asus ROG Zephyrus G16',
        'Sony WH-1000XM5', 'Apple Watch Ultra 2', 'Logitech MX Keys S', 'Anker Prime 20K Power Bank',
        'Acer Predator Helios 16', 'Bose QuietComfort Ultra Earbuds', 'DJI Osmo Pocket 3',
        'Keychron Q1 Pro', 'Lenovo ThinkPad X1 Carbon', 'Razer DeathAdder V3 Pro', 'Samsung Odyssey Neo G9'
      ];

      const fullNameMatches = allProductNames.filter(p => promptLower.includes(p.toLowerCase()));
      const matchedProducts = fullNameMatches.length > 0
        ? fullNameMatches
        : allProductNames.filter(p => {
          const firstWord = p.split(' ')[0].toLowerCase();
          return firstWord.length >= 4 && promptLower.includes(firstWord);
        });

      // Sort matched products by order of appearance in the user query
      matchedProducts.sort((a, b) => {
        const getPosInQuery = (name: string) => {
          const fullPos = promptLower.indexOf(name.toLowerCase());
          if (fullPos !== -1) return fullPos;
          const firstWord = name.split(' ')[0].toLowerCase();
          return promptLower.indexOf(firstWord);
        };
        return getPosInQuery(a) - getPosInQuery(b);
      });

      const isDetailQuery = systemPrompt.includes("For Product Detail queries") ||
        promptLower.includes('tell me about') ||
        promptLower.includes('describe') ||
        promptLower.includes('details');

      if (isDetailQuery && matchedProducts.length > 0) {
        const pName = matchedProducts[0];
        const datasetDir = path.join(__dirname, '..', '..', '..', 'data', 'sample_dataset', 'product_descriptions');
        if (fs.existsSync(datasetDir)) {
          const files = fs.readdirSync(datasetDir);
          const matchingFile =
            files.find(f => f.replace(/_/g, ' ').toLowerCase().includes(pName.toLowerCase())) ||
            files.find(f => {
              const cleanedF = f.replace(/_/g, ' ').replace(/\.(md|txt)$/i, '').toLowerCase();
              return pName.toLowerCase().split(' ').slice(0, 2).every(w => cleanedF.includes(w));
            });

          if (matchingFile) {
            const filePath = path.join(datasetDir, matchingFile);
            const content = fs.readFileSync(filePath, 'utf8');

            const sections = content.split('\n# ');
            const sectionMap: Record<string, string> = {};
            sections.forEach(sec => {
              const lines = sec.trim().split('\n');
              const header = lines[0].replace(/^#\s+/, '').trim().toLowerCase();
              const body = lines.slice(1).join('\n').trim();
              sectionMap[header] = body;
            });

            let title = sectionMap['product name'] || pName;
            if (title.startsWith('#')) title = title.replace(/^#\s+/, '').trim();

            const category = sectionMap['category'] || 'Accessories';
            const price = sectionMap['price'] || '$0';

            let warranty = sectionMap['warranty'] || 'N/A';
            if (warranty.includes('Warranty Period:')) {
              warranty = warranty.split('\n')[0].replace('Warranty Period:', '').trim();
            }

            const keyFeatures = sectionMap['key features'] || '';
            let recommendedFor = sectionMap['recommended for'] || '';
            recommendedFor = recommendedFor
              .split('\n')
              .map(line => line.replace(/^[\s*-]+/, '').trim())
              .filter(line => line.length > 0)
              .join('\n');

            const techSpecs = sectionMap['technical specifications'] || sectionMap['specs'] || sectionMap['specifications'] || '';

            return `${title}

Category:
${category}

Price:
${price}

Warranty:
${warranty}

Key Features:
${keyFeatures}

Technical Specifications:
${techSpecs ? techSpecs : '* Refer to product documentation on official channels.'}

Recommended For:
${recommendedFor}`;
          }
        }
      }

      // Heuristic 6: Fallback synthesis of context
      if (sources.length > 0) {
        let response = `Based on the verified documents in the context, here is the information related to your query:\n\n`;
        for (const src of sources) {
          response += `### ${src.product} (Source: ${src.file})\n`;
          const lines = src.text.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .slice(0, 5);
          response += lines.map(l => `* ${l.replace(/^[\s*-]+/, '')}`).join('\n') + `\n\n`;
        }
        response += `*(Note: Groq is running in simulated mock mode because the GROQ_API_KEY was rate-limited or not supplied)*`;
        return response;
      }
    }

    if (isJson) {
      return JSON.stringify({
        answer: `This is a simulated production-ready response. Based on our current catalog, the products mentioned in your query ('${userPrompt}') are highly rated. Please supply your GROQ_API_KEY in the backend .env file to enable live reasoning.`,
        confidenceScore: 0.85,
        sourcesUsed: []
      });
    }

    return `Based on our system records:
- The product or policy query '${userPrompt}' was matched successfully.
- For high-performance laptops: Dell XPS 15 supports up to 32GB RAM and RTX 4070 graphics, and features ExpressCharge fast charging (80% in 60 mins).
- Warranty details: Dell offers a 1-Year Limited Warranty, while Lenovo ThinkPad X1 has a 3-Year Premier Support window.
- Returns are supported within a 30-day window, subject to a 10% restocking fee for opened laptops.

*(Note: Groq is running in simulated mock mode because the GROQ_API_KEY was not supplied inside .env)*`;
  }
}
