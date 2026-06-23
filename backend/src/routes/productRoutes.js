import express from 'express';
import { getProducts } from '../controllers/productController.js';

const router = express.Router();

router.route('/').get(getProducts);

export default router;