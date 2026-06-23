import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A product must have a name.'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'A product must have a price.'],
      min: [0, 'Price cannot be negative.'],
    },
    category: {
      type: String,
      required: [true, 'A product must belong to a category.'],
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true, 
  }
);

// index for optimization of retriving large datasets
// category: 1 -> sorted in alphabetical order
// createdAt: -1 -> sorted in chronological order (newest first)
productSchema.index({ category: 1, createdAt: -1, _id: -1 });

const Product = mongoose.model('Product', productSchema);

export default Product;