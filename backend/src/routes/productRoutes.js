import express from 'express';
import { getProducts } from '../controllers/productController.js';

const router = express.Router();

// Direct incoming GET requests on our root resource straight to the controller
router.route('/').get(getProducts);

export default router;