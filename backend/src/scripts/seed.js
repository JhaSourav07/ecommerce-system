import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

// Load our database environment credentials
dotenv.config();

const TOTAL_PRODUCTS = 200000;
const BATCH_SIZE = 10000;

// Mock categories to evenly distribute our dataset across
const CATEGORIES = ['electronics', 'apparel', 'home', 'books', 'sports'];

const seedDatabase = async () => {
  try {
    console.log('⏳ Connecting to database cluster...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🚀 Database link stabilized.');

    // 1. Wipe the collection completely to guarantee a clean baseline
    console.log('🧹 Purging existing products collection...');
    await Product.deleteMany({});
    console.log('✨ Collection cleaned.');

    console.log(`📦 Commencing generation of ${TOTAL_PRODUCTS} products...`);
    const startTime = Date.now();

    // 2. Loop through our targeted total using our optimized batch chunks
    for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
      const batch = [];

      for (let j = 0; j < BATCH_SIZE; j++) {
        const productIndex = i + j;
        
        // Distribute categories round-robin style
        const category = CATEGORIES[productIndex % CATEGORIES.length];
        
        // Dynamically stagger the creation times backward into the past
        // Each product is born 1 minute earlier than the previous one
        const createdAtDate = new Date(Date.now() - productIndex * 60000);

        batch.push({
          name: `Premium Product ${productIndex}`,
          description: `This is a high-performance database seed asset for engineering test workflows. Generation index: ${productIndex}.`,
          price: parseFloat((Math.random() * 500 + 5).toFixed(2)),
          category: category,
          createdAt: createdAtDate,
          updatedAt: createdAtDate
        });
      }

      // 3. Ship the entire batch down the network pipeline in one go
      // we bypass validators here to maximize insertion throughput velocity
      await Product.insertMany(batch, { lean: true, ordered: false });
      
      const currentProgress = (((i + BATCH_SIZE) / TOTAL_PRODUCTS) * 100).toFixed(0);
      console.log(`📥 Progress: ${currentProgress}% completed (${i + BATCH_SIZE}/${TOTAL_PRODUCTS} items synchronized)`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Seeding operations completed successfully!`);
    console.log(`⏱️ Total Execution Time: ${duration} seconds`);

  } catch (error) {
    console.error('❌ Critical failure running database seed:', error);
  } finally {
    // 4. Cleanly disconnect our connection pool so the Node script can finish running
    await mongoose.disconnect();
    console.log('🔌 Disconnected smoothly from MongoDB Atlas.');
    process.exit(0);
  }
};

seedDatabase();