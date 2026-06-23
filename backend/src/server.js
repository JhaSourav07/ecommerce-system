import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import productRouter from './routes/productRoutes.js'; // Import our new routing layout

dotenv.config();

const app = express();
app.use(express.json());

connectDB();

// Mount API Resource Routes
app.use('/api/v1/products', productRouter);

// Base Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Backend engine active on port ${PORT}`);
});