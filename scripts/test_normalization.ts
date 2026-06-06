import { DBService } from '../backend/src/services/db.service';
import { QueryNormalizer } from '../backend/src/services/queryNormalizer.service';
import { IntentClassifier } from '../backend/src/services/intentClassifier.service';
import { MetadataFilterService } from '../backend/src/services/metadataFilter.service';
import { GroqService } from '../backend/src/services/groq.service';

// Mock config
process.env.NODE_ENV = 'development';

async function runNormalizationTest() {
  console.log('🤖 Starting Query Normalization & Intent Classification Offline Tests...');
  console.log('-------------------------------------------------------------------------');

  let passes = 0;
  let failures = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      passes++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      failures++;
      console.error(`❌ [FAIL] ${testName}`);
    }
  };

  try {
    // 1. Init Database and Services
    await DBService.initialize();
    GroqService.initialize();

    // Load active products dynamically
    const products = MetadataFilterService.getAllProductSpecifications();
    console.log(`Loaded ${products.length} products dynamically from product metadata index.`);

    // Find cheapest and costliest laptop names dynamically from metadata
    const laptops = products.filter(p => p.category.toLowerCase().includes('laptop'));
    laptops.sort((a, b) => a.offer_price - b.offer_price);
    const cheapestLaptopName = laptops[0]?.product_name || 'Dell XPS 15';
    const costliestLaptopName = laptops[laptops.length - 1]?.product_name || 'Apple MacBook Pro 16';

    console.log(`Cheapest Laptop in catalog: "${cheapestLaptopName}" ($${laptops[0]?.offer_price})`);
    console.log(`Costliest Laptop in catalog: "${costliestLaptopName}" ($${laptops[laptops.length - 1]?.offer_price})`);

    // ==========================================
    // SECTION 1: Cheapest-Product Synonyms
    // ==========================================
    console.log('\n--- SECTION 1: Cheapest-Product Synonyms ---');
    
    const cheapQueries = [
      "least expensive item",
      "budget option",
      "most cheap",
      "lowest cost"
    ];

    for (const q of cheapQueries) {
      const res = await QueryNormalizer.normalize(q, []);
      assert(
        res.normalizedQuery.toLowerCase().includes('cheapest') || res.normalizedQuery.toLowerCase().includes('lowest price'),
        `Synonym "${q}" normalized to: "${res.normalizedQuery}"`
      );
      assert(
        res.detectedIntent === 'CHEAPEST_PRODUCT',
        `Synonym "${q}" detected intent matches CHEAPEST_PRODUCT (Actual: ${res.detectedIntent})`
      );

      const mapped = IntentClassifier.mapIntentToLegacy(res.detectedIntent, res.normalizedQuery);
      assert(
        mapped === 'PRODUCT_CHEAPEST',
        `Synonym "${q}" mapped legacy intent is PRODUCT_CHEAPEST (Actual: ${mapped})`
      );
    }

    // ==========================================
    // SECTION 2: Costliest-Product Synonyms
    // ==========================================
    console.log('\n--- SECTION 2: Costliest-Product Synonyms ---');

    const costlyQueries = [
      "premium product",
      "most expensive",
      "highest price"
    ];

    for (const q of costlyQueries) {
      const res = await QueryNormalizer.normalize(q, []);
      assert(
        res.normalizedQuery.toLowerCase().includes('costliest') || res.normalizedQuery.toLowerCase().includes('highest price'),
        `Synonym "${q}" normalized to: "${res.normalizedQuery}"`
      );
      assert(
        res.detectedIntent === 'COSTLIEST_PRODUCT',
        `Synonym "${q}" detected intent matches COSTLIEST_PRODUCT (Actual: ${res.detectedIntent})`
      );

      const mapped = IntentClassifier.mapIntentToLegacy(res.detectedIntent, res.normalizedQuery);
      assert(
        mapped === 'PRODUCT_COSTLIEST',
        `Synonym "${q}" mapped legacy intent is PRODUCT_COSTLIEST (Actual: ${mapped})`
      );
    }

    // ==========================================
    // SECTION 3: Laptop Catalog Synonyms
    // ==========================================
    console.log('\n--- SECTION 3: Laptop Catalog Synonyms ---');

    const laptopQueries = [
      "show notebook computers",
      "list portable computers",
      "notebooks"
    ];

    for (const q of laptopQueries) {
      const res = await QueryNormalizer.normalize(q, []);
      assert(
        res.normalizedQuery.toLowerCase().includes('laptops available') || res.normalizedQuery.toLowerCase().includes('notebook'),
        `Synonym "${q}" normalized to: "${res.normalizedQuery}"`
      );
      assert(
        res.detectedIntent === 'CATALOG_LAPTOPS',
        `Synonym "${q}" detected intent matches CATALOG_LAPTOPS (Actual: ${res.detectedIntent})`
      );

      const mapped = IntentClassifier.mapIntentToLegacy(res.detectedIntent, res.normalizedQuery);
      assert(
        mapped === 'PRODUCT_FILTER',
        `Synonym "${q}" mapped legacy intent is PRODUCT_FILTER (Actual: ${mapped})`
      );
    }

    // ==========================================
    // SECTION 4: Follow-up Conversational Queries
    // ==========================================
    console.log('\n--- SECTION 4: Follow-up Conversational Queries ---');

    // Turn 1: Discuss Dell XPS 15 (or the dynamic cheapestLaptopName)
    const history = [
      { role: 'user' as const, content: `tell me about ${cheapestLaptopName}` },
      { role: 'assistant' as const, content: `The ${cheapestLaptopName} is a great choice with premium build quality.` }
    ];

    // Follow-up: "its price?"
    console.log(`\nTesting follow-up query: "its price?" after discussing ${cheapestLaptopName}...`);
    const priceRes = await QueryNormalizer.normalize("its price?", history);
    assert(
      priceRes.normalizedQuery.includes(cheapestLaptopName) && priceRes.normalizedQuery.toLowerCase().includes('price'),
      `"its price?" resolved standalone query: "${priceRes.normalizedQuery}"`
    );
    assert(
      priceRes.detectedIntent === 'PRICE_QUERY',
      `"its price?" detected intent: ${priceRes.detectedIntent}`
    );
    const priceMapped = IntentClassifier.mapIntentToLegacy(priceRes.detectedIntent, priceRes.normalizedQuery);
    assert(
      priceMapped === 'PRODUCT_PRICE_SINGLE',
      `"its price?" mapped legacy intent is PRODUCT_PRICE_SINGLE (Actual: ${priceMapped})`
    );

    // Follow-up: "what about warranty?"
    console.log(`\nTesting follow-up query: "what about warranty?" after discussing ${cheapestLaptopName}...`);
    const warrantyRes = await QueryNormalizer.normalize("what about warranty?", history);
    assert(
      warrantyRes.normalizedQuery.includes(cheapestLaptopName) && warrantyRes.normalizedQuery.toLowerCase().includes('warranty'),
      `"what about warranty?" resolved standalone query: "${warrantyRes.normalizedQuery}"`
    );
    assert(
      warrantyRes.detectedIntent === 'WARRANTY_QUERY',
      `"what about warranty?" detected intent: ${warrantyRes.detectedIntent}`
    );
    const warrantyMapped = IntentClassifier.mapIntentToLegacy(warrantyRes.detectedIntent, warrantyRes.normalizedQuery);
    assert(
      warrantyMapped === 'NORMAL_RAG',
      `"what about warranty?" mapped legacy intent is NORMAL_RAG (Actual: ${warrantyMapped})`
    );

    // Follow-up: "lowest?"
    console.log(`\nTesting follow-up query: "lowest?" after discussing laptop category context...`);
    const laptopHistory = [
      ...history,
      { role: 'user' as const, content: "do you have notebook computers?" },
      { role: 'assistant' as const, content: "Yes, we have multiple notebook models available." }
    ];
    const lowestRes = await QueryNormalizer.normalize("lowest?", laptopHistory);
    assert(
      lowestRes.normalizedQuery.toLowerCase().includes('laptop') && (lowestRes.normalizedQuery.toLowerCase().includes('lowest') || lowestRes.normalizedQuery.toLowerCase().includes('cheapest')),
      `"lowest?" resolved standalone query: "${lowestRes.normalizedQuery}"`
    );
    assert(
      lowestRes.detectedIntent === 'CHEAPEST_LAPTOP',
      `"lowest?" detected intent is CHEAPEST_LAPTOP (Actual: ${lowestRes.detectedIntent})`
    );
    const lowestMapped = IntentClassifier.mapIntentToLegacy(lowestRes.detectedIntent, lowestRes.normalizedQuery);
    assert(
      lowestMapped === 'PRODUCT_FILTER',
      `"lowest?" mapped legacy intent is PRODUCT_FILTER (Actual: ${lowestMapped})`
    );

    // Follow-up: "highest?"
    console.log(`\nTesting follow-up query: "highest?" after discussing laptop category context...`);
    const highestRes = await QueryNormalizer.normalize("highest?", laptopHistory);
    assert(
      highestRes.normalizedQuery.toLowerCase().includes('laptop') && (highestRes.normalizedQuery.toLowerCase().includes('highest') || highestRes.normalizedQuery.toLowerCase().includes('costliest')),
      `"highest?" resolved standalone query: "${highestRes.normalizedQuery}"`
    );
    assert(
      highestRes.detectedIntent === 'COSTLIEST_LAPTOP',
      `"highest?" detected intent is COSTLIEST_LAPTOP (Actual: ${highestRes.detectedIntent})`
    );
    const highestMapped = IntentClassifier.mapIntentToLegacy(highestRes.detectedIntent, highestRes.normalizedQuery);
    assert(
      highestMapped === 'PRODUCT_FILTER',
      `"highest?" mapped legacy intent is PRODUCT_FILTER (Actual: ${highestMapped})`
    );

    // Follow-up: "which one is cheapest?"
    console.log(`\nTesting follow-up query: "which one is cheapest?" after laptop context...`);
    const cheapestFollowupRes = await QueryNormalizer.normalize("which one is cheapest?", laptopHistory);
    assert(
      cheapestFollowupRes.normalizedQuery.toLowerCase().includes('laptop') && (cheapestFollowupRes.normalizedQuery.toLowerCase().includes('lowest') || cheapestFollowupRes.normalizedQuery.toLowerCase().includes('cheapest')),
      `"which one is cheapest?" resolved: "${cheapestFollowupRes.normalizedQuery}"`
    );

    // ==========================================
    // SECTION 5: Confidence Threshold Handling
    // ==========================================
    console.log('\n--- SECTION 5: Confidence Threshold Handling ---');

    console.log('Testing Intent classification with confidence < 0.65 threshold...');
    // Mocking classier response
    const lowConfResult = await IntentClassifier.classify(
      "something ambiguous",
      "CATALOG_LAPTOPS",
      0.50 // Below 0.65 threshold
    );

    assert(
      lowConfResult.intent === 'UNKNOWN',
      `Low confidence maps intent to UNKNOWN (Actual: ${lowConfResult.intent})`
    );

    const lowConfMapped = IntentClassifier.mapIntentToLegacy(lowConfResult.intent, "something ambiguous");
    assert(
      lowConfMapped === 'NORMAL_RAG',
      `UNKNOWN intent maps to legacy NORMAL_RAG (Actual: ${lowConfMapped})`
    );

    // Print summary
    console.log('\n=================== NORMALIZATION OFFLINE REPORT ===================');
    console.log(`🚀 Total Tests Executed: ${passes + failures}`);
    console.log(`🟢 Total Tests Passed  : ${passes}`);
    console.log(`🔴 Total Tests Failed  : ${failures}`);
    console.log('====================================================================');

    if (failures > 0) {
      process.exit(1);
    } else {
      console.log('💚 Normalization and Intent Classification layer tests passed successfully!');
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Normalization test encountered a crash:', err);
    process.exit(1);
  }
}

runNormalizationTest();
