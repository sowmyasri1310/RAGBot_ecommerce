import { DBService } from '../backend/src/services/db.service';
import { EmbeddingService } from '../backend/src/services/embedding.service';
import { QueryClassifier } from '../backend/src/rag/adaptive/queryClassifier';
import { QueryRewriter } from '../backend/src/rag/adaptive/queryRewriter';
import { FeedbackService } from '../backend/src/services/feedback.service';

// Force development mock-friendly configs
process.env.NODE_ENV = 'development';
process.env.CHROMADB_HOST = 'localhost';
process.env.CHROMADB_PORT = '8000';

async function runIntegrationTest() {
  console.log('🤖 Starting Adaptive RAG E-commerce Pipeline Integration Verification...');
  console.log('------------------------------------------------------------------------');

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
    // Test 1: JSON Database scaffolding
    await DBService.initialize();
    assert(DBService.getDocuments() !== undefined, 'JSON DB Service initialized and returned doc arrays.');

    // Test 2: Local Transformer Embedding Service
    console.log('\n🧠 Loading local embedding pipeline...');
    await EmbeddingService.initialize();
    const testText = 'Which laptop has 32GB RAM?';
    const embedding = await EmbeddingService.generate(testText);
    assert(Array.isArray(embedding), 'Embedding generator output is a valid array.');
    assert(embedding.length === 384, `Embedding dimensions matched. Expected: 384, Received: ${embedding.length}`);

    // Test 3: Query Intent Classification
    console.log('\n🏷️ Testing Query Classifier...');
    const compareResult = await QueryClassifier.classify('Compare Dell XPS and HP Spectre');
    assert(compareResult.classification === 'NORMAL_RAG', `Classification resolved correctly for comparisons. Detected: ${compareResult.classification}`);

    const warrantyResult = await QueryClassifier.classify('How long is the guarantee?');
    assert(warrantyResult.classification === 'NORMAL_RAG', `Classification resolved correctly for warranties. Detected: ${warrantyResult.classification}`);

    // Test 4: Query Rewriting
    console.log('\n📝 Testing Query Rewriting...');
    const rewritten = await QueryRewriter.rewrite('guarantee period laptop');
    assert(typeof rewritten === 'string' && rewritten.length > 0, `Query Rewriter returned optimized string: "${rewritten}"`);

    // Test 5: Feedback Database and Hybrid ranking searches
    console.log('\n🔍 Testing Feedback Hybrid Indexing...');
    // Seed standard feedback records
    const seededFb = await FeedbackService.addFeedback(
      'Which laptop supports 32GB RAM?',
      'Dell XPS 15 and ThinkPad X1 Carbon support 32GB RAM configurations.',
      'laptop, dell, ram, hardware, 32gb'
    );
    assert(seededFb.question === 'Which laptop supports 32GB RAM?', 'Feedback indexed successfully into database.');

    // Query matched perfectly
    console.log('Testing exact feedback vector match...');
    const searchMatch = await FeedbackService.searchFeedback('Which laptop supports 32GB RAM?');
    assert(searchMatch.matchFound === true, 'Semantic search successfully matched verified question.');
    assert(searchMatch.answer.includes('Dell XPS 15'), 'Verified feedback answer retrieved correctly.');

    // Query matched hybrid synthesis
    console.log('Testing tag overlap and similarity searches...');
    const hybridMatch = await FeedbackService.searchFeedback('Which dell laptop has 32GB memory?');
    assert(hybridMatch.matchFound === true, `Hybrid match triggered successfully. Score: ${hybridMatch.score?.toFixed(3)}`);


    // Complete Report summary
    console.log('\n=================== INTEGRATION VERIFICATION REPORT ===================');
    console.log(`🚀 Total Tests Executed: ${passes + failures}`);
    console.log(`🟢 Total Tests Passed  : ${passes}`);
    console.log(`🔴 Total Tests Failed  : ${failures}`);
    console.log('=======================================================================');

    if (failures > 0) {
      process.exit(1);
    } else {
      console.log('💚 All pipeline components are 100% operational in mock-safe offline developer environments!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Integration pipeline encountered a critical crash:', error);
    process.exit(1);
  }
}

runIntegrationTest();
