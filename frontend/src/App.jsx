import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://YOUR_BACKEND_RENDER_APP_NAME.onrender.com';

export default function App() {
  // Helper to read initial params from the URL search parameters
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      category: params.get('category') || '',
      cursor: params.get('cursor') || '',
      limit: params.get('limit') || ''
    };
  };

  const [urlParams, setUrlParams] = useState(getUrlParams);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(true);

  // Keep a history of cursors for the previous page backward navigation
  const [cursorHistory, setCursorHistory] = useState(['']);

  // Sync state with browser back/forward buttons (popstate event)
  useEffect(() => {
    const handlePopState = () => {
      const parsed = getUrlParams();
      setUrlParams(parsed);
      
      // Reset navigation history if navigating back to first page
      if (!parsed.cursor) {
        setCursorHistory(['']);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch catalog products whenever category, cursor, or limit parameter changes
  useEffect(() => {
    fetchProducts();
  }, [urlParams.category, urlParams.cursor, urlParams.limit]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setProducts([]);

      let url = `${API_BASE_URL}/api/v1/products`;
      const queryParams = [];
      if (urlParams.limit) {
        queryParams.push(`limit=${urlParams.limit}`);
      }
      if (urlParams.category) {
        queryParams.push(`category=${encodeURIComponent(urlParams.category)}`);
      }
      if (urlParams.cursor) {
        queryParams.push(`nextCursor=${encodeURIComponent(urlParams.cursor)}`);
      }
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setProducts(data.data);
        setNextCursor(data.pagination.nextCursor);
        setHasNextPage(data.pagination.hasNextPage);
      }
    } catch (err) {
      console.error('API connection failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Pushes changes into the browser URL and updates React state
  const updateUrl = (updates) => {
    const params = new URLSearchParams(window.location.search);
    
    if ('category' in updates) {
      if (updates.category) params.set('category', updates.category);
      else params.delete('category');
    }
    if ('cursor' in updates) {
      if (updates.cursor) params.set('cursor', updates.cursor);
      else params.delete('cursor');
    }
    if ('limit' in updates) {
      if (updates.limit) params.set('limit', updates.limit);
      else params.delete('limit');
    }

    const newSearchString = params.toString();
    const newUrl = `${window.location.pathname}${newSearchString ? `?${newSearchString}` : ''}`;
    
    window.history.pushState({}, '', newUrl);
    
    setUrlParams({
      category: params.get('category') || '',
      cursor: params.get('cursor') || '',
      limit: params.get('limit') || ''
    });
  };

  const handleCategoryChange = (newCat) => {
    setCursorHistory(['']); // Reset history stack
    updateUrl({ category: newCat, cursor: '' });
  };

  const handleLimitChange = (newLimit) => {
    setCursorHistory(['']); // Reset cursor stack since page size changed
    updateUrl({ limit: newLimit, cursor: '' });
  };

  const handleNextPage = () => {
    if (!nextCursor) return;
    
    setCursorHistory(prev => {
      if (prev.includes(nextCursor)) return prev;
      return [...prev, nextCursor];
    });

    updateUrl({ cursor: nextCursor });
  };

  const handlePrevPage = () => {
    const currentIndex = cursorHistory.indexOf(urlParams.cursor);
    if (currentIndex > 0) {
      const prevCursor = cursorHistory[currentIndex - 1];
      updateUrl({ cursor: prevCursor });
    } else {
      updateUrl({ cursor: '' });
    }
  };

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item._id !== id));
    } else {
      setCart(prev => prev.map(item =>
        item._id === id ? { ...item, quantity: newQty } : item
      ));
    }
  };

  // Decode Base64 cursor anchor values for displaying
  const getDecodedCursor = () => {
    if (!urlParams.cursor) return null;
    try {
      return JSON.parse(atob(urlParams.cursor));
    } catch (e) {
      return { error: 'Failed to decode cursor' };
    }
  };

  const decodedCursor = getDecodedCursor();

  // Mongoose Query representation helper
  const getQueryJSON = () => {
    const query = {};
    if (urlParams.category) query.category = urlParams.category;
    
    const activeAnchor = decodedCursor;
    if (activeAnchor && !activeAnchor.error) {
      query.$or = [
        { createdAt: { $lt: activeAnchor.createdAt } },
        { createdAt: activeAnchor.createdAt, _id: { $lt: activeAnchor._id } }
      ];
    }
    return JSON.stringify(query, null, 2);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div>
          <h1>E-Commerce Practice Site</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Simple e-commerce platform</p>
        </div>
        <div className="nav-actions">
          <input
            type="text"
            placeholder="Search products..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {/* Dynamic Page Limit Selection Dropdown */}
          <select 
            value={urlParams.limit} 
            onChange={(e) => handleLimitChange(e.target.value)}
            className="search-input"
            style={{ width: 'auto', cursor: 'pointer' }}
          >
            <option value="">Default limit</option>
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
          <button className="secondary" onClick={() => setIsCartOpen(!isCartOpen)}>
            Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
          </button>
          <button className="secondary" onClick={() => setIsDebugOpen(!isDebugOpen)}>
            {isDebugOpen ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>
      </header>

      {/* Category Selection Bar */}
      <div className="filters">
        {['', 'electronics', 'apparel', 'home', 'books', 'sports'].map(cat => (
          <button
            key={cat}
            className={`filter-btn ${urlParams.category === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat === '' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid and Cart Content */}
      <div className={`main-content ${isCartOpen ? 'with-sidebar' : ''}`}>
        
        {/* Products Catalogue */}
        <div>
          {/* Next/Prev Page navigation controls placed ABOVE the catalog page */}
          {(hasNextPage || urlParams.cursor) && !isLoading && (
            <div className="pagination-container" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
              <button 
                onClick={handlePrevPage} 
                disabled={!urlParams.cursor}
                className="secondary"
                style={{ opacity: urlParams.cursor ? 1 : 0.4 }}
              >
                &larr; Previous Page
              </button>
              <button 
                onClick={handleNextPage} 
                disabled={!hasNextPage}
                style={{ opacity: hasNextPage ? 1 : 0.4 }}
              >
                Next Page &rarr;
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="loading-placeholder">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="loading-placeholder">No products found.</div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map(product => (
                <div key={product._id} className="product-card">
                  <div className="product-details">
                    <span className="product-category">{product.category}</span>
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-desc">{product.description}</p>
                    <span className="product-date">
                      Added: {new Date(product.createdAt).toLocaleDateString()}
                    </span>
                    <div className="product-footer">
                      <span className="product-price">${product.price.toFixed(2)}</span>
                      <button onClick={() => addToCart(product)}>Add to Cart</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Cart */}
        {isCartOpen && (
          <div className="cart-sidebar">
            <h3 style={{ margin: 0, borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
              Your Cart
            </h3>
            {cart.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cart is empty.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {cart.map(item => (
                    <div key={item._id} className="cart-item">
                      <div>
                        <div className="cart-item-name">{item.name}</div>
                        <div style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          ${item.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="cart-item-qty">
                        <button onClick={() => updateQty(item._id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQty(item._id, item.quantity + 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '1rem', borderTop: '1px dashed #334155', paddingTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total:</span>
                    <span style={{ color: '#4ade80' }}>
                      ${cart.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}
                    </span>
                  </div>
                  <button
                    style={{ width: '100%', marginTop: '1rem', backgroundColor: '#22c55e' }}
                    onClick={() => {
                      alert('Checkout completed! Order placed.');
                      setCart([]);
                    }}
                  >
                    Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Embedded Debugger Pane */}
      {isDebugOpen && (
        <div className="debug-section" style={{ marginTop: '2rem' }}>
          <div className="debug-title">Cursor Pagination Status</div>
          <div>Total Loaded Products on Current Page: <strong>{products.length}</strong></div>
          <div>Active Page Size (Limit): <strong>{urlParams.limit}</strong></div>
          <div>Next Page Available: <strong>{hasNextPage ? 'Yes' : 'No'}</strong></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
            <span>Active URL Cursor Parameter:</span>
            <span style={{ color: '#c084fc', wordBreak: 'break-all' }}>
              {urlParams.cursor || 'null (Start of Collection)'}
            </span>
          </div>
          {nextCursor && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              <span>Next Cursor Token (For Next Page):</span>
              <span style={{ color: '#f43f5e', wordBreak: 'break-all' }}>
                {nextCursor}
              </span>
            </div>
          )}
          {decodedCursor && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              <span>Decoded URL Cursor:</span>
              <pre>{JSON.stringify(decodedCursor, null, 2)}</pre>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
            <span>Simulated Mongoose Query:</span>
            <pre>{getQueryJSON()}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
