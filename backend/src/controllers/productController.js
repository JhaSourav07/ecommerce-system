import Product from '../models/Product.js';

/**
 * @desc    Get all products with cursor-based pagination and category filtering
 * @route   GET /api/v1/products
 */
export const getProducts = async (req, res) => {
  try {
    const { category, nextCursor } = req.query;
    
    // 1. Enforce a strict limit count (default to 50 items)
    const limit = parseInt(req.query.limit, 10) || 50;
    
    // Build the initial base query with the required category filter
    const query = {};
    if (category) {
      query.category = category.trim().toLowerCase();
    }

    // 2. If a cursor is present, decode it and apply the pagination anchor
    if (nextCursor) {
      try {
        // Decode the opaque Base64 string back into a legible JSON string
        const decodedString = Buffer.from(nextCursor, 'base64').toString('ascii');
        const { createdAt, _id } = JSON.parse(decodedString);
        
        // Apply the compound cursor condition (sorting newest first)
        query.$or = [
          { createdAt: { $lt: new Date(createdAt) } },
          { createdAt: new Date(createdAt), _id: { $lt: _id } }
        ];
      } catch (err) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or malformed nextCursor string provided.' 
        });
      }
    }

    // 3. Fetch limit + 1 items to see if another page exists
    const products = await Product.find(query)
      .sort({ createdAt: -1, _id: -1 }) // Must perfectly mirror our index alignment
      .limit(limit + 1);

    // 4. Evaluate if there is a next page
    const hasNextPage = products.length > limit;
    
    // If a next page exists, remove the buffer item from our active payload array
    const paginatedProducts = hasNextPage ? products.slice(0, limit) : products;

    // 5. Construct the next opaque cursor string if applicable
    let generatedCursor = null;
    if (hasNextPage) {
      const lastItem = paginatedProducts[paginatedProducts.length - 1];
      const cursorPayload = {
        createdAt: lastItem.createdAt,
        _id: lastItem._id
      };
      // Encode the tracking values into an opaque Base64 string
      generatedCursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64');
    }

    // 6. Return standard structured JSON payload
    return res.status(200).json({
      success: true,
      count: paginatedProducts.length,
      pagination: {
        hasNextPage,
        nextCursor: generatedCursor
      },
      data: paginatedProducts
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error encountered while fetching products.',
      error: error.message
    });
  }
};