import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const runDiagnostics = async () => {
  try {
    console.log('⏳ Connecting to cluster for profiling...');
    await mongoose.connect(process.env.MONGO_URI);

    console.log('\n--- 🎯 SCENARIO 1: OPTIMIZED CURSOR QUERY (Using Compound Index) ---');
    
    // We append .explain("executionStats") to capture internal database metrics
    const optimizedPlan = await Product.find({ category: 'electronics' })
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .explain('executionStats');

    const stats = optimizedPlan.executionStats;
    console.log(`✅ Strategy Stage: ${stats.executionStages.stage}`); 
    console.log(`📦 Documents Returned: ${stats.nReturned}`);
    console.log(`🔍 Total Documents Read From Disk: ${stats.totalDocsExamined}`);
    console.log(`⏱️ Server Execution Time: ${stats.executionTimeMillis} ms`);

    console.log('\n--- ⚠️ SCENARIO 2: UNOPTIMIZED SORT QUERY (Violating Index Structure) ---');
    
    try {
      const unoptimizedPlan = await Product.find({ category: 'electronics' })
        .sort({ price: 1 }) // Sorting by price breaks our compound index structure!
        .limit(50)
        .explain('executionStats');
        
      const badStats = unoptimizedPlan.executionStats;
      console.log(`❌ Strategy Stage: ${badStats.executionStages.stage}`);
      console.log(`⏱️ Server Execution Time: ${badStats.executionTimeMillis} ms`);
    } catch (err) {
      console.log(`💥 Expected Crash: ${err.message}`);
    }

  } catch (error) {
    console.error('Diagnostic error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Profiler disconnected.');
    process.exit(0);
  }
};

runDiagnostics();