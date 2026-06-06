import { DBService } from '../backend/src/services/db.service';
import { AnswerVerifier } from '../backend/src/services/answerVerifier.service';
import { MetadataFilterService } from '../backend/src/services/metadataFilter.service';
import { GroqService } from '../backend/src/services/groq.service';

// Mock config
process.env.NODE_ENV = 'development';

async function runVerifierTest() {
  console.log('🤖 Starting Self-Evaluation & Verification Layer Offline Tests...');
  console.log('------------------------------------------------------------------');

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
    
    // 2. Test Catalog query with bad answer (Laptops available but answer says no match)
    console.log('\nTesting Test Case 1: Laptops catalog query with obvious failure answer...');
    const q1 = "What laptops are available?";
    const badA1 = "No laptop match that specification.";
    const result1 = await AnswerVerifier.verify(q1, "Dell XPS 15, HP Spectre, MacBook Pro", badA1, "PRODUCT_CATALOG");
    
    assert(result1.score < 20, `Score is < 20 for obvious laptop catalog failure. Score: ${result1.score}`);
    assert(result1.needs_regeneration === true, 'Needs regeneration flag is true.');
    assert(result1.faithful === false, 'Faithfulness is false.');

    // 2b. Test Regeneration of Case 1
    console.log('Testing Regeneration for Case 1...');
    const regenA1 = await AnswerVerifier.regenerate(q1, "Dell XPS 15, HP Spectre, MacBook Pro", "PRODUCT_CATALOG");
    assert(regenA1.includes("Dell XPS 15"), `Regenerated answer lists available laptops: "${regenA1}"`);

    // 3. Test Mobiles query with bad answer (lists unrelated products)
    console.log('\nTesting Test Case 2: Mobiles query with unrelated products returned...');
    const q2 = "What mobiles are available?";
    const badA2 = "Available products: Dell XPS 15 ($1899), HP Spectre x360 ($1599)";
    const result2 = await AnswerVerifier.verify(q2, "No mobiles in catalog", badA2, "PRODUCT_FILTER");
    
    assert(result2.score < 20, `Score is < 20 for mobiles query returning laptops. Score: ${result2.score}`);
    assert(result2.needs_regeneration === true, 'Needs regeneration flag is true.');

    // 3b. Test Regeneration of Case 2
    console.log('Testing Regeneration for Case 2...');
    const regenA2 = await AnswerVerifier.regenerate(q2, "No mobiles in catalog", "PRODUCT_FILTER");
    assert(regenA2.includes("No mobile phones are available"), `Regenerated answer correctly states no mobiles available: "${regenA2}"`);

    // 4. Test Valid single product price query (Price matches metadata)
    console.log('\nTesting Test Case 3: Valid price query...');
    const q3 = "price of Dell XPS 15";
    const goodA3 = "Product Name: Dell XPS 15\nPrice: $1899";
    const result3 = await AnswerVerifier.verify(q3, "Dell XPS 15 offer price: $1899", goodA3, "PRODUCT_PRICE_SINGLE");
    
    assert(result3.score >= 75, `Valid price query passes with score >= 75. Score: ${result3.score}`);
    assert(result3.needs_regeneration === false, 'Needs regeneration is false.');

    // 5. Test Invalid price query (Price mismatch metadata)
    console.log('\nTesting Test Case 4: Invalid price query (mismatch)...');
    const q4 = "price of Dell XPS 15";
    const badA4 = "Product Name: Dell XPS 15\nPrice: $50";
    const result4 = await AnswerVerifier.verify(q4, "Dell XPS 15 offer price: $1899", badA4, "PRODUCT_PRICE_SINGLE");
    
    assert(result4.score < 75, `Invalid price query fails with score < 75. Score: ${result4.score}`);
    assert(result4.needs_regeneration === true, 'Needs regeneration is true.');

    // Print summary
    console.log('\n=================== VERIFIER OFFLINE REPORT ===================');
    console.log(`🚀 Total Tests Executed: ${passes + failures}`);
    console.log(`🟢 Total Tests Passed  : ${passes}`);
    console.log(`🔴 Total Tests Failed  : ${failures}`);
    console.log('===============================================================');

    if (failures > 0) {
      process.exit(1);
    } else {
      console.log('💚 Verification layer checks passed successfully!');
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Verification test encountered a crash:', err);
    process.exit(1);
  }
}

runVerifierTest();
