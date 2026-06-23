import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const TOTAL_PRODUCTS = 200000;
const BATCH_SIZE = 10000;

const CATEGORIES = ['electronics', 'apparel', 'home', 'books', 'sports'];

const seedDatabase = async () => {
  try {
    console.log('⏳ Connecting to database cluster...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🚀 Database link stabilized.');

    console.log('🧹 Purging existing products collection...');
    await Product.deleteMany({});
    console.log('✨ Collection cleaned.');

    console.log(`📦 Commencing generation of ${TOTAL_PRODUCTS} products...`);
    const startTime = Date.now();

    for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
      const batch = [];

      for (let j = 0; j < BATCH_SIZE; j++) {
        const productIndex = i + j;
        const category = CATEGORIES[productIndex % CATEGORIES.length];
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
    await mongoose.disconnect();
    console.log('🔌 Disconnected smoothly from MongoDB Atlas.');
    process.exit(0);
  }
};

seedDatabase();