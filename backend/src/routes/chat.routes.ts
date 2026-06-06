import { Router, Request, Response, NextFunction } from 'express';
import { QueryClassifier } from '../rag/adaptive/queryClassifier';
import { QueryRewriter } from '../rag/adaptive/queryRewriter';
import { RetrievalManager } from '../rag/adaptive/retrievalManager';
import { ContextSelector } from '../rag/adaptive/contextSelector';
import { ConfidenceScorer } from '../rag/adaptive/confidenceScorer';
import { EvaluationFramework } from '../tracing/evaluation';
import { LangSmithTracer } from '../tracing/langsmith';
import { GroqService } from '../services/groq.service';
import { SessionService } from '../services/session.service';
import { DBService } from '../services/db.service';
import { ChromaDBService } from '../services/chromadb.service';
import { FeedbackService } from '../services/feedback.service';
import { MetadataFilterService } from '../services/metadataFilter.service';
import { logger } from '../utils/logger';
import { IntentDetector } from '../rag/adaptive/intentDetector';
import { QueryRouter } from '../rag/adaptive/queryRouter';
import { AnswerVerifier } from '../services/answerVerifier.service';
import { QueryNormalizer } from '../services/queryNormalizer.service';
import { IntentClassifier } from '../services/intentClassifier.service';

const router = Router();

/**
 * POST /chat
 * Orchestrates the full Adaptive RAG pipeline with session memory and query rewriting.
 */
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, sessionId = 'default_session' } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Missing required field: question' });
    }

    logger.info(`=== Received Chat Question in Session '${sessionId}': "${question}" ===`);

    // 1. Retrieve session memory
    const session = SessionService.getSession(sessionId);

    // 2. Perform Query Normalization and Intent Classification
    const normResult = await QueryNormalizer.normalize(question, session.conversationHistory);
    const intentResult = await IntentClassifier.classify(normResult.normalizedQuery, normResult.detectedIntent, normResult.confidence);
    const legacyIntent = IntentClassifier.mapIntentToLegacy(intentResult.intent, normResult.normalizedQuery);

    const originalQuery = question;
    const normalizedQuery = normResult.normalizedQuery;
    const resolvedQuery = normResult.normalizedQuery; // Use the normalized query for downstream processing
    const detectedIntent = intentResult.intent;
    const intentConfidence = intentResult.confidence;
    const finalRoutedIntent = legacyIntent;
    const normalizationApplied = normalizedQuery.toLowerCase().trim() !== originalQuery.toLowerCase().trim();

    // Use mapped legacy intent as classification and intent
    const classification = finalRoutedIntent;
    const intent = finalRoutedIntent;

    // Add user message to history
    SessionService.addMessage(sessionId, 'user', question);

    // Fetch all products for diagnostics
    const allMetadataProducts = MetadataFilterService.getAllProductSpecifications();
    const allProductNames = allMetadataProducts.map(p => p.product_name);

    // Diagnostic logger helper (Step 10)
    const logRetrievalDiagnostics = (
      intent: string,
      resultsFound: string | number,
      evaluated: string,
      filtered: string,
      finalSelected: string
    ) => {
      const block = `
================ RETRIEVAL DIAGNOSTICS ================
Detected Intent        : ${intent}
Metadata Results Found : ${resultsFound}
Products Evaluated     : ${evaluated}
Products Filtered      : ${filtered}
Final Product Selected : ${finalSelected}
=======================================================`;
      console.log(block);
      logger.info(block);
    };

    // Routing logs setup
    let selectedHandler = 'Adaptive RAG System';
    let feedbackSearchUsed = 'false';
    let catalogHandlerUsed = 'false';

    let answer = '';
    let confidenceScore = 1.0;
    let confidenceExplanation = '';
    let sourcesUsed: any[] = [];
    let traceId = '';
    let evaluationMetrics: any = null;
    let catalogFailed = false;
    let retrievedContext = '';
    let resolvedProduct = 'None';

    const printRoutingLogs = (queryType: string, handler: string, fbUsed: string, catUsed: string) => {
      console.log('--------------------------------------------------');
      console.log(`Detected Query Type: ${queryType}`);
      console.log(`Selected Handler: ${handler}`);
      console.log(`Feedback Search Used: ${fbUsed}`);
      console.log(`Catalog Handler Used: ${catUsed}`);
      console.log('--------------------------------------------------');
      
      logger.info(`Detected Query Type: ${queryType}`);
      logger.info(`Selected Handler: ${handler}`);
      logger.info(`Feedback Search Used: ${fbUsed}`);
      logger.info(`Catalog Handler Used: ${catUsed}`);
    };

    // Intercept with QueryRouter to handle metadata-only queries
    const routerResult = await QueryRouter.route(
      resolvedQuery,
      sessionId,
      intent,
      (intentStr, foundVal, evalStr, filtStr, selStr) => {
        logRetrievalDiagnostics(intentStr, foundVal, evalStr, filtStr, selStr);
      }
    );

    if (routerResult.handled) {
      answer = routerResult.answer || '';
      confidenceScore = routerResult.confidenceScore ?? 1.0;
      confidenceExplanation = routerResult.confidenceExplanation ?? 'Resolved by deterministic query router.';
      sourcesUsed = routerResult.sourcesUsed ?? [];
      traceId = `trace_router_${Date.now()}`;
      evaluationMetrics = {
        precision: 1.0,
        recall: 1.0,
        mrr: 1.0,
        contextRelevance: 1.0,
        faithfulness: 1.0,
        answerRelevance: 1.0,
        groundedness: 1.0,
        correctness: 1.0
      };

      selectedHandler = intent === 'PRODUCT_CATALOG' ? 'Product Catalog Handler' :
                        intent === 'PRODUCT_PRICE_LIST' ? 'Product Price List Handler' :
                        'Product Metadata Structured Handler';
      
      if (intent === 'PRODUCT_CATALOG') {
        catalogHandlerUsed = 'true';
      }

      printRoutingLogs(intent, selectedHandler, feedbackSearchUsed, catalogHandlerUsed);

      if (routerResult.resolvedProduct && routerResult.resolvedProduct !== 'None') {
        resolvedProduct = routerResult.resolvedProduct;
      }
      retrievedContext = sourcesUsed.map(s => s.text || s.product_name).join('\n') || 'Resolved by deterministic query router.';

    } else {
      if (classification === 'PRODUCT_CATALOG') {
        catalogHandlerUsed = 'true';
        try {
          const products = MetadataFilterService.getAllProductSpecifications();
          const uniqueNames = Array.from(new Set(products.map(p => p.product_name)));
          uniqueNames.sort((a, b) => a.localeCompare(b));
          
          selectedHandler = 'Product Catalog Handler';
          answer = `Available Products:\n\n${uniqueNames.map(name => `* ${name}`).join('\n')}`;

          confidenceScore = 1.0;
          confidenceExplanation = 'Catalog retrieved directly from Product Metadata Index.';
          sourcesUsed = products.map((p, idx) => ({
            id: `catalog_src_${idx}`,
            filename: p.source_file,
            product_name: p.product_name,
            collection: 'product_descriptions',
            similarity: 1.0,
            text: `Product Name: ${p.product_name}`
          }));

          evaluationMetrics = {
            precision: 1.0,
            recall: 1.0,
            mrr: 1.0,
            contextRelevance: 1.0,
            faithfulness: 1.0,
            answerRelevance: 1.0,
            groundedness: 1.0,
            correctness: 1.0
          };
          traceId = `trace_catalog_${Date.now()}`;
          
          logRetrievalDiagnostics(
            classification,
            uniqueNames.length,
            allProductNames.join(', '),
            'None',
            'All Products'
          );

          printRoutingLogs(classification, selectedHandler, feedbackSearchUsed, catalogHandlerUsed);
          resolvedProduct = 'Catalog Listing';
          retrievedContext = JSON.stringify(products);
        } catch (err) {
          catalogFailed = true;
          logger.error('Product Catalog Handler failed with error:', err);
        }
      }

      if (classification === 'PRODUCT_PRICE_LIST') {
        try {
          const products = MetadataFilterService.getAllProductSpecifications();
          const sortedProducts = [...products].sort((a, b) => a.offer_price - b.offer_price);
          
          selectedHandler = 'Product Price List Handler';
          let tableRows = sortedProducts.map(p => `${p.product_name} | $${p.offer_price}`).join('\n');
          answer = `Product | Current Price\n---|---\n${tableRows}`;

          confidenceScore = 1.0;
          confidenceExplanation = 'Prices retrieved directly from Product Metadata Index.';
          sourcesUsed = sortedProducts.map((p, idx) => ({
            id: `price_src_${idx}`,
            filename: p.source_file,
            product_name: p.product_name,
            collection: 'product_descriptions',
            similarity: 1.0,
            text: `Product Name: ${p.product_name}, Price: $${p.price}, Offer Price: $${p.offer_price}`
          }));

          evaluationMetrics = {
            precision: 1.0,
            recall: 1.0,
            mrr: 1.0,
            contextRelevance: 1.0,
            faithfulness: 1.0,
            answerRelevance: 1.0,
            groundedness: 1.0,
            correctness: 1.0
          };
          traceId = `trace_pricelist_${Date.now()}`;

          logRetrievalDiagnostics(
            classification,
            sortedProducts.length,
            allProductNames.join(', '),
            'None',
            'All Prices'
          );

          printRoutingLogs(classification, selectedHandler, feedbackSearchUsed, catalogHandlerUsed);
          resolvedProduct = 'Price List Listing';
          retrievedContext = JSON.stringify(products);
        } catch (err) {
          logger.error('Product Price List Handler failed with error:', err);
        }
      }

      const isMetadataStructuredQuery = ['PRODUCT_CHEAPEST', 'PRODUCT_COSTLIEST', 'PRODUCT_FILTER'].includes(classification);
      
      if (isMetadataStructuredQuery) {
        try {
          const allProducts = MetadataFilterService.getAllProductSpecifications();
          const matchingProducts = MetadataFilterService.filterProducts(resolvedQuery, classification);
          
          let targetProduct = 'None';
          let targetPrice = 'None';
          
          if (classification === 'PRODUCT_CHEAPEST' && matchingProducts.length > 0) {
            targetProduct = matchingProducts[0].product_name;
            targetPrice = `$${matchingProducts[0].offer_price}`;
          } else if (classification === 'PRODUCT_COSTLIEST' && matchingProducts.length > 0) {
            targetProduct = matchingProducts[0].product_name;
            targetPrice = `$${matchingProducts[0].offer_price}`;
          } else if (classification === 'PRODUCT_FILTER' && matchingProducts.length > 0) {
            targetProduct = matchingProducts.map(p => p.product_name).join(', ');
            targetPrice = matchingProducts.map(p => `$${p.offer_price}`).join(', ');
          }

          const filteredList = allProductNames.filter(name => !matchingProducts.some(m => m.product_name === name));
          logRetrievalDiagnostics(
            classification,
            matchingProducts.length,
            allProductNames.join(', '),
            filteredList.length > 0 ? filteredList.join(', ') : 'None',
            targetProduct
          );

          if (matchingProducts.length === 0) {
            answer = "I'm only able to answer questions about our product catalog, specs, pricing, warranties, and policies. For anything else, I'd recommend a general web search!";
            confidenceScore = 0.5;
            confidenceExplanation = 'No products matched the metadata filter constraints.';
            retrievedContext = "No matching products found.";
          } else {
            const structuredContext = MetadataFilterService.generateStructuredContext(matchingProducts);
            
            let systemPrompt = `You are a professional, helpful E-commerce Product Assistant.
Your task is to write a final friendly, clear response to the user's query: "${resolvedQuery}".
Here is the pre-filtered structured product catalog specifications matching the query:
"""
${structuredContext}
"""

Rigid constraints:
- Do NOT perform any sorting, filtering, ranking, or price calculations yourself. We have already done this in the backend.
- Rely ONLY on the specifications provided in the context above.
- Mention the source file name (e.g. source_file) of the products in your explanation if relevant.`;

            if (classification === 'PRODUCT_CHEAPEST') {
              systemPrompt += `\n- Confirm that the cheapest product is indeed "${targetProduct}" at a price of "${targetPrice}".
- Format your response clearly. Include a section for:
Product Name
Price
Reason
(Do not use other headers for these). Explain the reason using details of the product from the context, and make sure it doesn't look like it's based on a single chunk.`;
            } else if (classification === 'PRODUCT_COSTLIEST') {
              systemPrompt += `\n- Confirm that the costliest product is indeed "${targetProduct}" at a price of "${targetPrice}".
- Format your response exactly like this:
Product Name: [Name]
Price: [Price]
(Do not add any preamble or conversational fillers before or after this format).`;
            } else {
              systemPrompt += `\n- Clearly present all matching products listed in the context.
              - Summarize why they match the filters requested in the query.`;
            }

            answer = await GroqService.chatCompletion(systemPrompt, `User Query: "${resolvedQuery}"`, {
              temperature: 0.2
            });

            confidenceScore = 1.0;
            confidenceExplanation = 'Grounded directly on metadata specifications filtered by the backend.';
            retrievedContext = structuredContext;
          }

          selectedHandler = 'Product Metadata Structured Handler';
          sourcesUsed = matchingProducts.map((p, idx) => ({
            id: `meta_src_${idx}`,
            filename: p.source_file,
            product_name: p.product_name,
            collection: 'product_descriptions',
            similarity: 1.0,
            text: `Product: ${p.product_name}, Category: ${p.category}, Price: $${p.price}, Offer Price: $${p.offer_price}, RAM: ${p.ram}, GPU: ${p.gpu}, Display: ${p.display}, Battery: ${p.battery}, Warranty: ${p.warranty}`
          }));

          evaluationMetrics = {
            precision: 1.0,
            recall: 1.0,
            mrr: 1.0,
            contextRelevance: 1.0,
            faithfulness: 1.0,
            answerRelevance: 1.0,
            groundedness: 1.0,
            correctness: 1.0
          };
          traceId = `trace_meta_${Date.now()}`;

          printRoutingLogs(classification, selectedHandler, feedbackSearchUsed, catalogHandlerUsed);
          resolvedProduct = targetProduct;
        } catch (err) {
          logger.error('Structured metadata query handler failed with error:', err);
        }
      }

      // Standard RAG or Fallback paths
      if (!isMetadataStructuredQuery && classification !== 'PRODUCT_CATALOG' && classification !== 'PRODUCT_PRICE_LIST') {
        let ragFailed = false;
        let optimizedSearchQuery = '';
        let retrievedChunks: any[] = [];
        let chunksUsed: any[] = [];
        let contextText = '';

        const retrievalClassification = catalogFailed ? 'FAQ_QUERY' : classification;

        const metadataClassifications = [
          'CHEAPEST_PRODUCT', 'MOST_EXPENSIVE_PRODUCT', 'RAM_FILTER',
          'GPU_FILTER', 'DISPLAY_FILTER', 'BATTERY_FILTER', 'PRICE_QUERY',
          'PRICE_COMPARISON', 'WARRANTY_QUERY'
        ];
        const isMetadataQuery = metadataClassifications.includes(classification);
        let structuredContext = '';
        let matchingProducts: any[] = [];
        if (isMetadataQuery) {
          matchingProducts = MetadataFilterService.filterProducts(resolvedQuery, classification);
          structuredContext = MetadataFilterService.generateStructuredContext(matchingProducts);
          logger.info(`Metadata Filter Engine generated structured context for ${matchingProducts.length} products.`);
        }

        try {
          optimizedSearchQuery = await QueryRewriter.rewrite(resolvedQuery);
          const vectorChunks = await RetrievalManager.retrieve(optimizedSearchQuery, retrievalClassification, routerResult?.whereFilter);

          const directChunks: any[] = [];
          if (isMetadataQuery && matchingProducts && matchingProducts.length > 0) {
            const activeName = ChromaDBService.getCollectionName();
            const collection = ChromaDBService.getCollection(activeName);
            for (const prod of matchingProducts) {
              try {
                const getResults = await collection.get({
                  where: { filename: prod.source_file }
                });
                if (getResults && getResults.ids) {
                  for (let i = 0; i < getResults.ids.length; i++) {
                    directChunks.push({
                      id: getResults.ids[i],
                      text: getResults.documents[i] || '',
                      metadata: getResults.metadatas[i] || {},
                      distance: 0.0,
                      similarity: 1.0,
                      collection: 'product_descriptions'
                    });
                  }
                }
              } catch (err) {
                logger.error(`Error fetching chunks for product ${prod.product_name}:`, err);
              }
            }
            logger.info(`Retrieved ${directChunks.length} chunks directly for ${matchingProducts.length} filtered products.`);
          }

          retrievedChunks = [...directChunks, ...vectorChunks];

          if (retrievedChunks.length === 0 && !isMetadataQuery) {
            ragFailed = true;
            logger.warn('Adaptive RAG retrieval returned 0 chunks. Proceeding to Feedback Search.');
          } else {
            let resolvedProductRAG = '';
            if (classification === 'PRODUCT_DETAIL') {
              const topChunk = retrievedChunks[0];
              if (topChunk && topChunk.metadata && topChunk.metadata.product_name && topChunk.metadata.product_name !== 'Catalog Listing') {
                resolvedProductRAG = topChunk.metadata.product_name;
                SessionService.setCurrentProduct(sessionId, resolvedProductRAG);
              }
            } else if (
              classification === 'PRODUCT_CATALOG' ||
              classification === 'PRODUCT_PRICE_LIST' ||
              classification === 'PRODUCT_CHEAPEST' ||
              classification === 'PRODUCT_COSTLIEST' ||
              classification === 'PRODUCT_FILTER'
            ) {
              SessionService.setCurrentProduct(sessionId, '');
            }

            if (classification === 'PRODUCT_DETAIL') {
              const filteredList = allProductNames.filter(name => name !== resolvedProductRAG);
              logRetrievalDiagnostics(
                classification,
                resolvedProductRAG ? 1 : 0,
                allProductNames.join(', '),
                resolvedProductRAG ? filteredList.join(', ') : allProductNames.join(', '),
                resolvedProductRAG || 'None'
              );
            } else if (classification === 'NORMAL_RAG') {
              logRetrievalDiagnostics(classification, 'N/A', 'N/A', 'N/A', 'N/A');
            }

            let candidateChunks = retrievedChunks;

            if (isMetadataQuery && matchingProducts && matchingProducts.length > 0) {
              const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
              const matchingNormalized = matchingProducts.map(p => normalize(p.product_name));
              
              candidateChunks = candidateChunks.filter(chunk => {
                const chunkProdNormalized = normalize(chunk.metadata.product_name || '');
                const chunkFileNormalized = normalize(chunk.metadata.filename || '');
                
                return matchingNormalized.some(name => 
                  chunkProdNormalized.includes(name) || 
                  name.includes(chunkProdNormalized) ||
                  chunkFileNormalized.includes(name) ||
                  name.includes(chunkFileNormalized)
                );
              });
            }

            const selection = ContextSelector.select(candidateChunks, resolvedQuery);
            let finalChunksUsed = selection.chunksUsed;
            contextText = selection.contextText;
            chunksUsed = finalChunksUsed;

            let combinedContext = '';
            if (structuredContext) {
              combinedContext += `STRUCTURED PRODUCT SPECIFICATIONS (FILTERED/SORTED BY BACKEND):\n${structuredContext}\n\n`;
            }
            combinedContext += `VERIFIED CONTEXT CHUNKS:\n${contextText}`;
            retrievedContext = combinedContext;

            logger.info('Synthesizing final answer with Groq LLM...');
            let systemPrompt = `You are a professional, helpful E-commerce Product Assistant.
Answer the customer's question using ONLY the provided verified source documents and structured metadata in the context.
Follow these rigid rules:
- Ground your entire response ONLY on the facts given in the context (both the structured product specifications and the context chunks).
- Do NOT perform any filtering, sorting, calculations, or inference. All sorting and filtering has already been done for you by the backend filter engine. Just explain, summarize, compare, or recommend the matching products presented to you in the context.
- If no matching products or facts are found, state clearly: "I'm only able to answer questions about our product catalog, specs, pricing, warranties, and policies. For anything else, I'd recommend a general web search!"
- When comparing products, use clear bullet points.
- Include mention of the sources used to support your claims (by their file name).
- Keep the response professional, friendly, and structured.

Context Documents:
"""
${combinedContext}
"""`;

            if (classification === 'PRODUCT_DETAIL') {
              systemPrompt += `\n\nFor Product Detail queries, you MUST structure your response EXACTLY in the following format using the exact information from the context. Do not add introductory conversational filler (e.g. "Here is the details for...") or trailing pleasantries. Start directly with the product name.

Layout Template:
[Product Name]

Category:
[Category]

Price:
$[Price]

Warranty:
[Warranty]

Key Features:
* [Feature 1]
* [Feature 2]
...

Technical Specifications:
* [Specification 1]
* [Specification 2]
...

Recommended For:
[Recommendation 1]
[Recommendation 2]
...`;
            }

            answer = await GroqService.chatCompletion(systemPrompt, `Question: "${resolvedQuery}"`, {
              temperature: 0.2
            });

            const confidenceResult = await ConfidenceScorer.compute(resolvedQuery, contextText, answer);
            confidenceScore = confidenceResult.confidenceScore;
            confidenceExplanation = confidenceResult.explanation;
            sourcesUsed = chunksUsed.map(c => ({
              id: c.id,
              filename: c.metadata.filename,
              product_name: c.metadata.product_name,
              collection: c.collection,
              similarity: c.similarity,
              text: c.text
            }));

            if (confidenceScore < 0.4) {
              logger.warn(`Adaptive RAG synthesis failed with low confidence (${confidenceScore}). Proceeding to Feedback Search.`);
              ragFailed = true;
            }
          }
        } catch (error) {
          ragFailed = true;
          logger.error('Adaptive RAG System encountered an error:', error);
        }

        if (ragFailed) {
          logger.warn('Invoking Feedback Search fallback...');
          selectedHandler = 'Feedback Search Fallback';
          feedbackSearchUsed = 'true';

          const searchResult = await FeedbackService.searchFeedback(resolvedQuery);
          answer = searchResult.answer;
          confidenceScore = searchResult.score || 0.75;
          confidenceExplanation = searchResult.matchFound ? 'Grounded via pre-verified feedback database fallback match.' : 'Fallback match not found in pre-verified feedback database.';
          
          traceId = `trace_fb_${Date.now()}`;
          evaluationMetrics = {
            precision: searchResult.matchFound ? 1.0 : 0.0,
            recall: searchResult.matchFound ? 1.0 : 0.0,
            mrr: searchResult.matchFound ? 1.0 : 0.0,
            contextRelevance: 1.0,
            faithfulness: 1.0,
            answerRelevance: 1.0,
            groundedness: 1.0,
            correctness: searchResult.matchFound ? 1.0 : 0.0
          };
          sourcesUsed = [];
          retrievedContext = answer;
        }

        printRoutingLogs(classification, selectedHandler, feedbackSearchUsed, catalogHandlerUsed);
      }
    }

    // === ANSWER VERIFICATION & SELF-EVALUATION LOOP (MAX 1 REGEN ATTEMPT) ===
    logger.info(`[AnswerVerifier] Checking answer with verifier: "${answer}"...`);
    const initialAnswer = answer;
    let verifierResult = await AnswerVerifier.verify(resolvedQuery, retrievedContext, answer, classification);
    let verifierScore = verifierResult.score;
    let verificationStatus = verifierResult.faithful && verifierResult.relevant ? 'passed' : 'failed';
    let regeneratedCount = 0;

    if (verifierScore < 75) {
      logger.info(`[AnswerVerifier] Score (${verifierScore}) below threshold (75). Regenerating answer...`);
      regeneratedCount = 1;
      
      // Regenerate answer
      answer = await AnswerVerifier.regenerate(resolvedQuery, retrievedContext, classification);
      
      // Verify regenerated answer
      verifierResult = await AnswerVerifier.verify(resolvedQuery, retrievedContext, answer, classification);
      verifierScore = verifierResult.score;
      verificationStatus = verifierResult.faithful && verifierResult.relevant ? 'regenerated' : 'failed';
      logger.info(`[AnswerVerifier] Regenerated answer verifier score: ${verifierScore}. Status: ${verificationStatus}`);
    }

    // Programmatic verification override: ensure score is set to < 20 if still failed
    if (verificationStatus === 'failed') {
      verifierScore = Math.min(verifierScore, 19);
    }

    // Log verification details (Step 5)
    logger.info(`
================ ANSWER VERIFICATION LOG ================
Question: "${resolvedQuery}"
Intent: "${classification}"
Generated Answer: "${initialAnswer}"
Verifier Score: ${verifierScore}
Verifier Reason: "${verifierResult.reason}"
Regenerated?: ${regeneratedCount > 0 ? 'Yes' : 'No'}
Final Answer: "${answer}"
==========================================================
    `);

    // Evaluate the final RAG execution run with normalization metrics
    evaluationMetrics = await EvaluationFramework.evaluateRun(
      resolvedQuery,
      sourcesUsed,
      answer,
      retrievedContext,
      classification,
      confidenceScore,
      traceId || `trace_${Date.now()}`,
      verifierScore,
      verificationStatus,
      regeneratedCount,
      undefined, // intentAccuracy derived in judge
      normalizationApplied,
      intentConfidence,
      originalQuery,
      normalizedQuery,
      resolvedQuery,
      detectedIntent,
      finalRoutedIntent
    );

    // Log trace tree to LangSmith with all normalization steps and parameters
    const collectionsQueried = sourcesUsed.map(c => c.collection || 'product_descriptions').filter((v, i, self) => self.indexOf(v) === i);
    traceId = await LangSmithTracer.logPipelineRun(
      resolvedQuery,
      resolvedQuery, // rewritten query
      classification,
      collectionsQueried,
      sourcesUsed.length,
      sourcesUsed.length,
      answer,
      confidenceScore,
      evaluationMetrics,
      verifierScore,
      verificationStatus,
      regeneratedCount,
      initialAnswer,
      evaluationMetrics?.intentAccuracy,
      normalizationApplied,
      intentConfidence,
      originalQuery,
      normalizedQuery,
      resolvedQuery,
      detectedIntent,
      finalRoutedIntent
    );

    // Save to memory history
    const inMemorySession = SessionService.getSession(sessionId);
    inMemorySession.conversationHistory.push({ role: 'user', content: question });
    inMemorySession.conversationHistory.push({ role: 'assistant', content: answer });
    if (inMemorySession.conversationHistory.length > 10) {
      inMemorySession.conversationHistory.shift();
      inMemorySession.conversationHistory.shift();
    }
    SessionService.setLastSources(sessionId, sourcesUsed);
    if (resolvedProduct && resolvedProduct !== 'None') {
      SessionService.setCurrentProduct(sessionId, resolvedProduct);
    }

    // Save chat session to JSON database
    let dbSession = DBService.getChatSession(sessionId);
    const now = new Date().toISOString();
    
    if (!dbSession) {
      dbSession = {
        sessionId,
        title: question.trim().substring(0, 50) + (question.trim().length > 50 ? '...' : ''),
        created_at: now,
        updated_at: now,
        messages: []
      };
    } else {
      dbSession.updated_at = now;
    }
    
    dbSession.messages.push({
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: question,
      timestamp: now
    });
    
    dbSession.messages.push({
      id: `msg_${Date.now() + 1}_assistant`,
      role: 'assistant',
      content: answer,
      timestamp: now,
      sources: sourcesUsed,
      confidenceScore: confidenceScore
    });
    
    DBService.saveChatSession(dbSession);

    return res.status(200).json({
      success: true,
      answer,
      confidenceScore,
      confidenceExplanation,
      classification,
      resolvedProduct: SessionService.getSession(sessionId).currentProduct || 'None',
      rewrittenQuery: resolvedQuery,
      sourcesUsed,
      traceId,
      evaluation: evaluationMetrics,
      originalQuery,
      normalizedQuery,
      detectedIntent,
      intentConfidence,
      finalRoutedIntent,
      normalizationApplied
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /retrieve
 * Exposes vector search. Returns raw ranked retrieval chunks.
 */
router.post('/retrieve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, classification = 'FAQ_QUERY' } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }

    const rewritten = await QueryRewriter.rewrite(query);
    const name = QueryRouter.extractProductName(query);
    const where = name ? { product_name: { $eq: name } } : undefined;
    const chunks = await RetrievalManager.retrieve(rewritten, classification, where);
    
    return res.status(200).json({
      query,
      rewrittenQuery: rewritten,
      classification,
      chunks: chunks.map(c => ({
        id: c.id,
        text: c.text,
        filename: c.metadata.filename,
        similarity: c.similarity,
        collection: c.collection
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /rewrite-query
 * Exposes standalone query rewriting utility.
 */
router.post('/rewrite-query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }

    const rewrittenQuery = await QueryRewriter.rewrite(query);
    return res.status(200).json({ query, rewrittenQuery });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /chat/history
 * Returns the list of all stored chat sessions with resolved query and product tags.
 */
router.get('/chat/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = DBService.getChatSessions();
    const summary = sessions.map(s => {
      const questions = s.messages.filter(m => m.role === 'user').map(m => m.content);
      const productsSet = new Set<string>();
      
      s.messages.forEach(m => {
        if (m.role === 'assistant' && m.sources) {
          m.sources.forEach((src: any) => {
            if (src.product_name) {
              productsSet.add(src.product_name);
            }
          });
        }
      });
      
      return {
        sessionId: s.sessionId,
        title: s.title,
        created_at: s.created_at,
        updated_at: s.updated_at,
        questions,
        products: Array.from(productsSet)
      };
    });
    
    // Sort sessions by updated_at descending (most recent first)
    summary.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    return res.status(200).json({ success: true, history: summary });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /chat/history/:sessionId
 * Returns the full messages history for a specific chat session.
 */
router.get('/chat/history/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = DBService.getChatSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    // Sync to in-memory SessionService so subsequent turns in this session work correctly
    const inMemorySession = SessionService.getSession(sessionId);
    if (inMemorySession.conversationHistory.length === 0 && session.messages.length > 0) {
      logger.info(`Synchronizing reopened database session '${sessionId}' to in-memory SessionService.`);
      const recentMessages = session.messages.slice(-10);
      inMemorySession.conversationHistory = recentMessages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const assistantMessages = session.messages.filter(m => m.role === 'assistant');
      if (assistantMessages.length > 0) {
        const lastWithProduct = [...assistantMessages].reverse().find(m => m.sources && m.sources.length > 0);
        if (lastWithProduct && lastWithProduct.sources) {
          const topProduct = lastWithProduct.sources[0]?.product_name;
          if (topProduct && topProduct !== 'Catalog Listing') {
            inMemorySession.currentProduct = topProduct;
          }
        }
      }
    }
    
    return res.status(200).json({ success: true, session });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /chat/history/:sessionId
 * Deletes a specific chat session.
 */
router.delete('/chat/history/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    SessionService.clearSession(sessionId);
    const deleted = DBService.deleteChatSession(sessionId);
    if (!deleted) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    return res.status(200).json({ success: true, message: `Session ${sessionId} deleted.` });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /chat/history
 * Clears all chat history records.
 */
router.delete('/chat/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    DBService.clearAllChatSessions();
    return res.status(200).json({ success: true, message: 'All chat sessions deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
