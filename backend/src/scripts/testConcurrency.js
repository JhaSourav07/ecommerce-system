import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const API_URL = 'http://localhost:5000/api/v1/products?category=electronics&limit=10';

const runConcurrencyTest = async () => {
  try {
    console.log('🧪 Commencing Concurrency & Data Consistency Simulation...');
    
    // 1. Fetch Page 1 via our actual live HTTP API endpoint
    console.log('📡 Requesting Page 1 from API...');
    const page1Response = await fetch(API_URL);
    const page1Result = await page1Response.json();
    
    const page1Products = page1Result.data;
    const nextCursor = page1Result.pagination.nextCursor;
    
    console.log(`✅ Page 1 loaded. Retrieved ${page1Products.length} items.`);
    const page1Ids = new Set(page1Products.map(p => p._id));

    // 2. Open a direct link to the DB to simulate a background write process
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n💽 Simulating background concurrent activity...');
    console.log('📥 Inserting 50 new premium products into the "electronics" category...');
    
    const modernStamps = [];
    for (let i = 0; i < 50; i++) {
      modernStamps.push({
        name: `Concurrent Flash Product ${i}`,
        description: 'Simulated real-time inventory mutation asset.',
        price: 99.99,
        category: 'electronics' // Born with current Date.now() timestamp
      });
    }
    await Product.insertMany(modernStamps);
    console.log('⚡ 50 new products successfully committed to disk.');

    // 3. Fetch Page 2 using our saved opaque cursor anchor
    console.log(`\n📡 Requesting Page 2 using cursor anchor: [${nextCursor.substring(0, 15)}...]`);
    const page2Response = await fetch(`${API_URL}&nextCursor=${nextCursor}`);
    const page2Result = await page2Response.json();
    const page2Products = page2Result.data;
    
    console.log(`✅ Page 2 loaded. Retrieved ${page2Products.length} items.`);

    // 4. Assert and validate the core engineering requirements
    console.log('\n📊 Running Architectural Assertions...');
    let duplicateCount = 0;
    
    for (const product of page2Products) {
      if (page1Ids.has(product._id)) {
        duplicateCount++;
        console.error(`❌ DUPLICATE DETECTED: Product ID ${product._id} appeared on both pages!`);
      }
    }

    if (duplicateCount === 0) {
      console.log('🎉 CRITICAL REQUIREMENT MET: Zero duplicate products encountered across pages!');
    } else {
      console.log(`🚨 FAIL: encountered ${duplicateCount} broken item shifts.`);
    }

    // 5. Clean up the concurrent simulation items so our dataset remains pristine
    console.log('\n🧹 Clearing simulated concurrent background assets...');
    await Product.deleteMany({ name: { $regex: 'Concurrent Flash Product' } });
    console.log('✨ Database state normalized.');

  } catch (error) {
    console.error('💥 Test pipeline failed with error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Simulation engine deactivated.');
    process.exit(0);
  }
};

runConcurrencyTest();