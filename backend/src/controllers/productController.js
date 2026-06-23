import Product from '../models/Product.js';

export const getProducts = async (req, res) => {
  try {
    const { category, nextCursor } = req.query;
    
    const limit = parseInt(req.query.limit, 10) || 50;
    
    const query = {};
    if (category) {
      query.category = category.trim().toLowerCase();
    }

    if (nextCursor) {
      try {
        const decodedString = Buffer.from(nextCursor, 'base64').toString('ascii');
        const { createdAt, _id } = JSON.parse(decodedString);
        
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

    const products = await Product.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);

    const hasNextPage = products.length > limit;
    
    const paginatedProducts = hasNextPage ? products.slice(0, limit) : products;

    let generatedCursor = null;
    if (hasNextPage) {
      const lastItem = paginatedProducts[paginatedProducts.length - 1];
      const cursorPayload = {
        createdAt: lastItem.createdAt,
        _id: lastItem._id
      };
      generatedCursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64');
    }

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