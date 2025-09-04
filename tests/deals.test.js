// Deal Management Tests - Core functionality testing
const request = require('supertest');
const express = require('express');

// Mock the deal management functionality
function createDealTestServer() {
  const app = express();
  app.use(express.json());

  // Mock data
  const mockDeals = [
    {
      id: '1',
      title: 'Amazing Electronics Deal',
      description: 'Great discount on electronics',
      price: 99.99,
      original_price: 149.99,
      discount_percentage: 33,
      deal_url: 'https://example.com/deal1',
      category_id: '1',
      store_id: '1',
      created_by: 'user-123',
      status: 'active',
      likes: 5,
      dislikes: 1,
      created_at: '2024-01-01T00:00:00Z',
      category_name: 'Electronics',
      store_name: 'Tech Store',
      username: 'dealmaker'
    },
    {
      id: '2', 
      title: 'Fashion Sale',
      description: 'Clothing deals',
      price: 29.99,
      original_price: 59.99,
      discount_percentage: 50,
      deal_url: 'https://example.com/deal2',
      category_id: '2',
      store_id: '2',
      created_by: 'user-456',
      status: 'active',
      likes: 3,
      dislikes: 0,
      created_at: '2024-01-02T00:00:00Z',
      category_name: 'Fashion',
      store_name: 'Fashion Store',
      username: 'fashionista'
    }
  ];

  const mockCategories = [
    { id: '1', name: 'Electronics', emoji: '📱', is_active: true },
    { id: '2', name: 'Fashion', emoji: '👕', is_active: true },
    { id: '3', name: 'Food', emoji: '🍕', is_active: true }
  ];

  const mockStores = [
    { id: '1', name: 'Tech Store', slug: 'tech-store', logo_url: 'tech-logo.png' },
    { id: '2', name: 'Fashion Store', slug: 'fashion-store', logo_url: 'fashion-logo.png' },
    { id: '3', name: 'Food Store', slug: 'food-store', logo_url: 'food-logo.png' }
  ];

  // Deal endpoints
  app.get('/api/deals', (req, res) => {
    const { category, store, search, limit = 20 } = req.query;
    let filteredDeals = [...mockDeals];

    if (category && category !== 'all') {
      filteredDeals = filteredDeals.filter(deal => deal.category_name.toLowerCase() === category.toLowerCase());
    }

    if (store) {
      filteredDeals = filteredDeals.filter(deal => deal.store_name.toLowerCase().includes(store.toLowerCase()));
    }

    if (search) {
      filteredDeals = filteredDeals.filter(deal => 
        deal.title.toLowerCase().includes(search.toLowerCase()) ||
        deal.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json(filteredDeals.slice(0, parseInt(limit)));
  });

  app.get('/api/deals/:id', (req, res) => {
    const { id } = req.params;
    const deal = mockDeals.find(d => d.id === id);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json(deal);
  });

  app.post('/api/deals', (req, res) => {
    const { title, description, price, original_price, deal_url, category_id, store_id } = req.body;
    
    if (!title || !description || !price || !deal_url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (price < 0 || (original_price && original_price < price)) {
      return res.status(400).json({ error: 'Invalid price values' });
    }

    const newDeal = {
      id: String(mockDeals.length + 1),
      title,
      description,
      price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : null,
      discount_percentage: original_price ? Math.round(((original_price - price) / original_price) * 100) : 0,
      deal_url,
      category_id,
      store_id,
      created_by: 'user-123',
      status: 'active',
      likes: 0,
      dislikes: 0,
      created_at: new Date().toISOString()
    };

    mockDeals.push(newDeal);
    res.status(201).json(newDeal);
  });

  app.put('/api/deals/:id', (req, res) => {
    const { id } = req.params;
    const dealIndex = mockDeals.findIndex(d => d.id === id);
    
    if (dealIndex === -1) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const updates = req.body;
    mockDeals[dealIndex] = { ...mockDeals[dealIndex], ...updates };
    res.json(mockDeals[dealIndex]);
  });

  app.delete('/api/deals/:id', (req, res) => {
    const { id } = req.params;
    const dealIndex = mockDeals.findIndex(d => d.id === id);
    
    if (dealIndex === -1) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    mockDeals.splice(dealIndex, 1);
    res.json({ success: true });
  });

  // Categories endpoints
  app.get('/api/categories', (req, res) => {
    const { is_active } = req.query;
    let categories = [...mockCategories];
    
    if (is_active === 'true') {
      categories = categories.filter(cat => cat.is_active);
    }
    
    res.json(categories);
  });

  app.post('/api/categories', (req, res) => {
    const { name, emoji, is_active = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const newCategory = {
      id: String(mockCategories.length + 1),
      name,
      emoji: emoji || '📦',
      is_active,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      created_at: new Date().toISOString()
    };

    mockCategories.push(newCategory);
    res.status(201).json(newCategory);
  });

  // Stores endpoints
  app.get('/api/stores', (req, res) => {
    res.json(mockStores);
  });

  app.post('/api/stores', (req, res) => {
    const { name, logo_url, website_url } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Store name is required' });
    }

    const newStore = {
      id: String(mockStores.length + 1),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      logo_url,
      website_url,
      created_at: new Date().toISOString()
    };

    mockStores.push(newStore);
    res.status(201).json(newStore);
  });

  // Deal interactions
  app.post('/api/deals/:id/like', (req, res) => {
    const { id } = req.params;
    const deal = mockDeals.find(d => d.id === id);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    deal.likes += 1;
    res.json({ success: true, likes: deal.likes });
  });

  app.post('/api/deals/:id/dislike', (req, res) => {
    const { id } = req.params;
    const deal = mockDeals.find(d => d.id === id);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    deal.dislikes += 1;
    res.json({ success: true, dislikes: deal.dislikes });
  });

  // Saved deals
  app.post('/api/saved-deals', (req, res) => {
    const { dealId, userId } = req.body;
    
    if (!dealId || !userId) {
      return res.status(400).json({ error: 'dealId and userId are required' });
    }

    res.json({ success: true, message: 'Deal saved successfully' });
  });

  app.delete('/api/saved-deals', (req, res) => {
    const { dealId, userId } = req.query;
    
    if (!dealId || !userId) {
      return res.status(400).json({ error: 'dealId and userId are required' });
    }

    res.json({ success: true, message: 'Deal unsaved successfully' });
  });

  app.get('/api/saved-deals/check', (req, res) => {
    const { dealId, userId } = req.query;
    
    if (!dealId || !userId) {
      return res.status(400).json({ error: 'dealId and userId are required' });
    }

    // Mock - always return not saved for simplicity
    res.json({ saved: false });
  });

  return app;
}

describe('Deal Management System Tests', () => {
  let server;

  beforeAll(() => {
    server = createDealTestServer();
  });

  describe('Deal CRUD Operations', () => {
    test('should fetch all deals', async () => {
      const response = await request(server)
        .get('/api/deals');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('price');
    });

    test('should fetch deals with category filter', async () => {
      const response = await request(server)
        .get('/api/deals?category=electronics');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(deal => deal.category_name === 'Electronics')).toBe(true);
    });

    test('should fetch deals with search query', async () => {
      const response = await request(server)
        .get('/api/deals?search=electronics');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should fetch specific deal by ID', async () => {
      const response = await request(server)
        .get('/api/deals/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', '1');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('price');
    });

    test('should return 404 for non-existent deal', async () => {
      const response = await request(server)
        .get('/api/deals/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Deal not found');
    });

    test('should create new deal with valid data', async () => {
      const newDeal = {
        title: 'Test Deal',
        description: 'Test description',
        price: 19.99,
        original_price: 29.99,
        deal_url: 'https://example.com/test',
        category_id: '1',
        store_id: '1'
      };

      const response = await request(server)
        .post('/api/deals')
        .send(newDeal);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newDeal.title);
      expect(response.body.price).toBe(newDeal.price);
      expect(response.body.discount_percentage).toBe(33);
    });

    test('should reject deal creation with missing fields', async () => {
      const invalidDeal = {
        title: 'Test Deal'
        // Missing required fields
      };

      const response = await request(server)
        .post('/api/deals')
        .send(invalidDeal);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    test('should reject deal with invalid price values', async () => {
      const invalidDeal = {
        title: 'Test Deal',
        description: 'Test description',
        price: 50,
        original_price: 30, // Original price less than current price
        deal_url: 'https://example.com/test'
      };

      const response = await request(server)
        .post('/api/deals')
        .send(invalidDeal);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid price values');
    });

    test('should update existing deal', async () => {
      const updates = {
        title: 'Updated Deal Title',
        price: 15.99
      };

      const response = await request(server)
        .put('/api/deals/1')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updates.title);
      expect(response.body.price).toBe(updates.price);
    });

    test('should delete existing deal', async () => {
      const response = await request(server)
        .delete('/api/deals/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Deal Interactions', () => {
    test('should like a deal', async () => {
      const response = await request(server)
        .post('/api/deals/1/like');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('likes');
      expect(typeof response.body.likes).toBe('number');
    });

    test('should dislike a deal', async () => {
      const response = await request(server)
        .post('/api/deals/1/dislike');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('dislikes');
      expect(typeof response.body.dislikes).toBe('number');
    });

    test('should save a deal', async () => {
      const response = await request(server)
        .post('/api/saved-deals')
        .send({
          dealId: '1',
          userId: 'user-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should unsave a deal', async () => {
      const response = await request(server)
        .delete('/api/saved-deals?dealId=1&userId=user-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should check if deal is saved', async () => {
      const response = await request(server)
        .get('/api/saved-deals/check?dealId=1&userId=user-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('saved');
      expect(typeof response.body.saved).toBe('boolean');
    });
  });

  describe('Categories Management', () => {
    test('should fetch all categories', async () => {
      const response = await request(server)
        .get('/api/categories');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('emoji');
    });

    test('should fetch only active categories', async () => {
      const response = await request(server)
        .get('/api/categories?is_active=true');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(cat => cat.is_active === true)).toBe(true);
    });

    test('should create new category', async () => {
      const newCategory = {
        name: 'Test Category',
        emoji: '🧪',
        is_active: true
      };

      const response = await request(server)
        .post('/api/categories')
        .send(newCategory);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newCategory.name);
      expect(response.body.emoji).toBe(newCategory.emoji);
    });

    test('should reject category creation without name', async () => {
      const invalidCategory = {
        emoji: '🧪'
        // Missing name
      };

      const response = await request(server)
        .post('/api/categories')
        .send(invalidCategory);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Category name is required');
    });
  });

  describe('Store Management', () => {
    test('should fetch all stores', async () => {
      const response = await request(server)
        .get('/api/stores');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('slug');
    });

    test('should create new store', async () => {
      const newStore = {
        name: 'Test Store',
        logo_url: 'test-logo.png',
        website_url: 'https://teststore.com'
      };

      const response = await request(server)
        .post('/api/stores')
        .send(newStore);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newStore.name);
      expect(response.body.slug).toBe('test-store');
    });

    test('should reject store creation without name', async () => {
      const invalidStore = {
        logo_url: 'test-logo.png'
        // Missing name
      };

      const response = await request(server)
        .post('/api/stores')
        .send(invalidStore);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Store name is required');
    });
  });
});
