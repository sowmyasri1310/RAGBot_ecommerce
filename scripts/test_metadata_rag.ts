import { DBService } from '../backend/src/services/db.service';
import { QueryClassifier } from '../backend/src/rag/adaptive/queryClassifier';
import { MetadataFilterService, ProductMetadata } from '../backend/src/services/metadataFilter.service';

async function testMetadataRAG() {
  console.log('🤖 Starting Metadata-Aware Adaptive RAG Test...');
  console.log('----------------------------------------------------');

  try {
    await DBService.initialize();
    
    // 1. Test Query Classifications
    console.log('1. Testing Deterministic Classification:');
    const tests = [
      { q: "Which product is cheapest?", expected: "CHEAPEST_PRODUCT" },
      { q: "Which product has highest cost?", expected: "MOST_EXPENSIVE_PRODUCT" },
      { q: "Which laptops have 16GB RAM?", expected: "RAM_FILTER" },
      { q: "Which laptops support RTX graphics?", expected: "GPU_FILTER" },
      { q: "Which products cost under $500?", expected: "PRICE_QUERY" },
      { q: "Which products have OLED displays?", expected: "DISPLAY_FILTER" },
      { q: "Which products support fast charging?", expected: "BATTERY_FILTER" },
      { q: "Give me prices for all products", expected: "PRICE_COMPARISON" }
    ];

    let passCount = 0;
    for (const test of tests) {
      const res = await QueryClassifier.classify(test.q);
      const passed = res.classification === test.expected;
      if (passed) passCount++;
      console.log(`Query: "${test.q}" -> Classified: ${res.classification} (Expected: ${test.expected}) - ${passed ? '✅ PASS' : '❌ FAIL'}`);
    }

    // 2. Test Metadata Filtering & Sorting
    console.log('\n2. Testing Metadata Filtering:');
    const cheapProducts = MetadataFilterService.filterProducts("Which product is cheapest?", "CHEAPEST_PRODUCT");
    console.log(`Cheapest product filter count: ${cheapProducts.length}`);
    if (cheapProducts.length > 0) {
      const passed = cheapProducts[0].product_name === 'Anker Prime 20K Power Bank' && cheapProducts[0].price === 129;
      console.log(`Cheapest product: ${cheapProducts[0].product_name} - $${cheapProducts[0].price} (Expected: Anker Prime 20K Power Bank - $129) - ${passed ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      console.log('Cheapest product: None ❌ FAIL');
    }

    const expensiveProducts = MetadataFilterService.filterProducts("Which product has highest cost?", "MOST_EXPENSIVE_PRODUCT");
    console.log(`Costliest product filter count: ${expensiveProducts.length}`);
    if (expensiveProducts.length > 0) {
      const passed = expensiveProducts[0].product_name === 'Apple MacBook Pro 16' && expensiveProducts[0].price === 2499;
      console.log(`Costliest product: ${expensiveProducts[0].product_name} - $${expensiveProducts[0].price} (Expected: Apple MacBook Pro 16 - $2499) - ${passed ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      console.log('Costliest product: None ❌ FAIL');
    }

    const ram16Products = MetadataFilterService.filterProducts("Which laptops have 16GB RAM?", "RAM_FILTER");
    console.log(`Laptops with 16GB+ RAM: [${ram16Products.map((p: ProductMetadata) => p.product_name).join(', ')}]`);
    const laptopNames = ram16Products.map((p: ProductMetadata) => p.product_name);
    const hasSpectre = laptopNames.includes('HP Spectre x360');
    const hasMacBook = laptopNames.includes('Apple MacBook Pro 16');
    const hasROG = laptopNames.includes('Asus ROG Zephyrus G16');
    console.log(`Includes Spectre, MacBook Pro, Asus ROG: ${hasSpectre && hasMacBook && hasROG ? '✅ PASS' : '❌ FAIL'}`);

    const under500Products = MetadataFilterService.filterProducts("Which products cost under $500?", "PRICE_QUERY");
    console.log(`Products under $500 count: ${under500Products.length} (Expected: 6) - ${under500Products.length === 6 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Products under $500: [${under500Products.map((p: ProductMetadata) => p.product_name).join(', ')}]`);

    console.log('\n=================== VERIFICATION SUMMARY ===================');
    console.log(`Classifications Passed: ${passCount}/${tests.length}`);
    console.log(`Verification completed.`);
  } catch (error) {
    console.error('Test script crashed:', error);
  }
}

testMetadataRAG();
