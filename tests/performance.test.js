// Performance and Edge Cases Tests
const request = require('supertest');
const express = require('express');

function createPerformanceTestServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Mock stress testing data
  const generateLargeDataset = (size) => {
    return Array.from({ length: size }, (_, i) => ({
      id: `item-${i}`,
      title: `Test Item ${i}`,
      description: `Description for test item ${i}`,
      created_at: new Date(Date.now() - i * 1000).toISOString(),
      data: `${'x'.repeat(100)}` // 100 character string per item
    }));
  };

  // Rate limiting simulation
  const rateLimitMap = new Map();
  const rateLimit = (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }
    
    const requests = rateLimitMap.get(ip);
    
    // Remove requests older than 1 minute
    while (requests.length > 0 && requests[0] < now - 60000) {
      requests.shift();
    }
    
    if (requests.length >= 100) { // 100 requests per minute limit
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retry_after: 60 
      });
    }
    
    requests.push(now);
    next();
  };

  app.use('/api/stress/', rateLimit);

  // Large dataset endpoints
  app.get('/api/stress/large-dataset', (req, res) => {
    const { size = 1000, page = 1, limit = 100 } = req.query;
    const totalSize = parseInt(size);
    const pageSize = parseInt(limit);
    const currentPage = parseInt(page);
    
    if (totalSize > 10000) {
      return res.status(400).json({ error: 'Dataset size too large (max 10000)' });
    }
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalSize);
    
    const dataset = generateLargeDataset(totalSize);
    const pageData = dataset.slice(startIndex, endIndex);
    
    res.json({
      data: pageData,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalSize,
        total_pages: Math.ceil(totalSize / pageSize),
        has_next: endIndex < totalSize,
        has_prev: currentPage > 1
      },
      performance: {
        query_time: Math.random() * 100 + 50, // Simulated query time in ms
        memory_usage: `${Math.floor(totalSize * 0.1)}MB`
      }
    });
  });

  // Concurrent request testing
  app.post('/api/stress/concurrent', (req, res) => {
    const { delay = 0, id } = req.body;
    
    setTimeout(() => {
      res.json({
        request_id: id || Math.random().toString(36).substring(7),
        processed_at: new Date().toISOString(),
        delay_ms: delay,
        server_load: Math.random() * 100
      });
    }, delay);
  });

  // Memory stress test
  app.get('/api/stress/memory', (req, res) => {
    const { size = 'small' } = req.query;
    
    let dataSize;
    switch (size) {
      case 'small':
        dataSize = 1000;
        break;
      case 'medium':
        dataSize = 10000;
        break;
      case 'large':
        dataSize = 50000;
        break;
      default:
        return res.status(400).json({ error: 'Invalid size parameter' });
    }
    
    const heavyData = generateLargeDataset(dataSize);
    
    // Simulate processing time
    const startTime = Date.now();
    
    // Simulate some CPU-intensive operation
    let sum = 0;
    for (let i = 0; i < dataSize * 10; i++) {
      sum += Math.sqrt(i);
    }
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      size: size,
      items_processed: dataSize,
      processing_time_ms: processingTime,
      memory_footprint: `${Math.floor(dataSize * 0.001)}MB`,
      computed_sum: sum,
      sample_data: heavyData.slice(0, 3) // Only return first 3 items to avoid huge response
    });
  });

  // Error simulation endpoints
  app.get('/api/edge/random-error', (req, res) => {
    const errorChance = parseFloat(req.query.chance || 0.5);
    
    if (Math.random() < errorChance) {
      const errors = [
        { status: 500, message: 'Internal server error' },
        { status: 503, message: 'Service temporarily unavailable' },
        { status: 504, message: 'Gateway timeout' },
        { status: 502, message: 'Bad gateway' }
      ];
      
      const randomError = errors[Math.floor(Math.random() * errors.length)];
      return res.status(randomError.status).json({ error: randomError.message });
    }
    
    res.json({ success: true, message: 'Request succeeded' });
  });

  // Input validation edge cases
  app.post('/api/edge/validate-input', (req, res) => {
    const { text, number, email, url } = req.body;
    const errors = [];
    
    // Test various edge cases
    if (text !== undefined) {
      if (typeof text !== 'string') {
        errors.push('Text must be a string');
      } else if (text.length === 0) {
        errors.push('Text cannot be empty');
      } else if (text.length > 10000) {
        errors.push('Text too long (max 10000 characters)');
      } else if (/[<>]/.test(text)) {
        errors.push('Text contains invalid characters');
      }
    }
    
    if (number !== undefined) {
      if (typeof number !== 'number') {
        errors.push('Number must be a number type');
      } else if (!Number.isFinite(number)) {
        errors.push('Number must be finite');
      } else if (number < 0) {
        errors.push('Number must be non-negative');
      } else if (number > Number.MAX_SAFE_INTEGER) {
        errors.push('Number exceeds maximum safe integer');
      }
    }
    
    if (email !== undefined) {
      if (typeof email !== 'string') {
        errors.push('Email must be a string');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push('Invalid email format');
        } else if (email.length > 254) {
          errors.push('Email too long (max 254 characters)');
        }
      }
    }
    
    if (url !== undefined) {
      if (typeof url !== 'string') {
        errors.push('URL must be a string');
      } else {
        try {
          const urlObj = new URL(url);
          if (!['http:', 'https:'].includes(urlObj.protocol)) {
            errors.push('URL must use HTTP or HTTPS protocol');
          }
        } catch {
          errors.push('Invalid URL format');
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    res.json({ 
      valid: true, 
      message: 'All inputs are valid',
      processed_inputs: { text, number, email, url }
    });
  });

  // Database simulation with edge cases
  app.get('/api/edge/database-edge-cases', (req, res) => {
    const { operation, simulate_error } = req.query;
    
    // Simulate various database edge cases
    if (simulate_error === 'connection_timeout') {
      return res.status(504).json({ 
        error: 'Database connection timeout',
        details: 'Connection to database took longer than 30 seconds'
      });
    }
    
    if (simulate_error === 'deadlock') {
      return res.status(409).json({ 
        error: 'Database deadlock detected',
        details: 'Transaction was deadlocked and has been chosen as the deadlock victim'
      });
    }
    
    if (simulate_error === 'out_of_memory') {
      return res.status(507).json({ 
        error: 'Insufficient storage',
        details: 'Database server has run out of available memory'
      });
    }
    
    if (operation === 'bulk_insert') {
      // Simulate bulk insert performance
      const recordCount = parseInt(req.query.records || 1000);
      const estimatedTime = recordCount * 0.1; // 0.1ms per record
      
      res.json({
        operation: 'bulk_insert',
        records_inserted: recordCount,
        estimated_time_ms: estimatedTime,
        performance_metrics: {
          rows_per_second: Math.floor(recordCount / (estimatedTime / 1000)),
          memory_used: `${Math.floor(recordCount * 0.001)}MB`
        }
      });
    } else {
      res.json({ 
        operation: operation || 'default',
        status: 'success',
        message: 'Database operation completed successfully'
      });
    }
  });

  // Cache testing endpoints
  app.get('/api/edge/cache-test', (req, res) => {
    const { cache_key, ttl = 300 } = req.query;
    
    if (!cache_key) {
      return res.status(400).json({ error: 'cache_key is required' });
    }
    
    // Simulate cache operations
    const cacheHit = Math.random() > 0.3; // 70% cache hit rate
    
    res.json({
      cache_key,
      cache_hit: cacheHit,
      ttl: parseInt(ttl),
      data: cacheHit ? 'cached_data_value' : 'fresh_data_value',
      cache_stats: {
        hit_rate: 0.7,
        miss_rate: 0.3,
        total_requests: 1000,
        cache_size: '150MB'
      }
    });
  });

  return app;
}

describe('Performance and Edge Cases Tests', () => {
  let server;

  beforeAll(() => {
    server = createPerformanceTestServer();
  });

  describe('Large Dataset Handling', () => {
    test('should handle large dataset request with pagination', async () => {
      const response = await request(server)
        .get('/api/stress/large-dataset?size=5000&page=1&limit=50');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data.length).toBe(50);
      expect(response.body.pagination.total).toBe(5000);
      expect(response.body).toHaveProperty('performance');
    }, 10000); // 10 second timeout for large data

    test('should reject extremely large dataset requests', async () => {
      const response = await request(server)
        .get('/api/stress/large-dataset?size=50000');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Dataset size too large (max 10000)');
    });

    test('should handle pagination edge cases', async () => {
      const response = await request(server)
        .get('/api/stress/large-dataset?size=100&page=999&limit=50');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
      expect(response.body.pagination.has_next).toBe(false);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        request(server)
          .post('/api/stress/concurrent')
          .send({ id: `req-${i}`, delay: 100 })
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('request_id', `req-${index}`);
        expect(response.body).toHaveProperty('processed_at');
      });
    }, 15000);

    test('should handle delayed requests properly', async () => {
      const startTime = Date.now();
      
      const response = await request(server)
        .post('/api/stress/concurrent')
        .send({ delay: 500 });

      const endTime = Date.now();
      const actualDelay = endTime - startTime;

      expect(response.status).toBe(200);
      expect(actualDelay).toBeGreaterThanOrEqual(500);
      expect(response.body).toHaveProperty('delay_ms', 500);
    }, 10000);
  });

  describe('Memory and Performance Testing', () => {
    test('should handle small memory load', async () => {
      const response = await request(server)
        .get('/api/stress/memory?size=small');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('size', 'small');
      expect(response.body).toHaveProperty('items_processed');
      expect(response.body).toHaveProperty('processing_time_ms');
      expect(response.body.items_processed).toBe(1000);
    });

    test('should handle medium memory load', async () => {
      const response = await request(server)
        .get('/api/stress/memory?size=medium');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('size', 'medium');
      expect(response.body.items_processed).toBe(10000);
      expect(response.body.processing_time_ms).toBeGreaterThan(0);
    }, 15000);

    test('should handle large memory load', async () => {
      const response = await request(server)
        .get('/api/stress/memory?size=large');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('size', 'large');
      expect(response.body.items_processed).toBe(50000);
      expect(typeof response.body.computed_sum).toBe('number');
    }, 30000);

    test('should reject invalid memory size parameter', async () => {
      const response = await request(server)
        .get('/api/stress/memory?size=invalid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid size parameter');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      const response = await request(server)
        .get('/api/stress/large-dataset?size=10');

      expect(response.status).toBe(200);
    });

    // Note: Testing actual rate limiting requires sending 100+ requests rapidly
    // which is not practical in a test suite, but the endpoint is configured
  });

  describe('Error Simulation and Edge Cases', () => {
    test('should randomly generate errors based on chance parameter', async () => {
      // Test with 100% error chance
      const response = await request(server)
        .get('/api/edge/random-error?chance=1.0');

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.body).toHaveProperty('error');
    });

    test('should succeed with 0% error chance', async () => {
      const response = await request(server)
        .get('/api/edge/random-error?chance=0.0');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Input Validation Edge Cases', () => {
    test('should validate valid inputs', async () => {
      const response = await request(server)
        .post('/api/edge/validate-input')
        .send({
          text: 'Valid text',
          number: 42,
          email: 'test@example.com',
          url: 'https://example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('processed_inputs');
    });

    test('should reject invalid text input', async () => {
      const response = await request(server)
        .post('/api/edge/validate-input')
        .send({
          text: '<script>alert("xss")</script>'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Text contains invalid characters');
    });

    test('should reject invalid number input', async () => {
      const response = await request(server)
        .post('/api/edge/validate-input')
        .send({
          number: -5
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Number must be non-negative');
    });

    test('should reject invalid email', async () => {
      const response = await request(server)
        .post('/api/edge/validate-input')
        .send({
          email: 'not-an-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Invalid email format');
    });

    test('should reject invalid URL', async () => {
      const response = await request(server)
        .post('/api/edge/validate-input')
        .send({
          url: 'not-a-url'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Invalid URL format');
    });

    test('should handle empty string input', async () => {
      const response = await request(server)
        .post('/api/edge/validate-input')
        .send({
          text: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Text cannot be empty');
    });

    test('should handle extremely large text input', async () => {
      const response = await request(server)
        .post('/api/edge/validate-input')
        .send({
          text: 'x'.repeat(20000)
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Text too long (max 10000 characters)');
    });
  });

  describe('Database Edge Cases Simulation', () => {
    test('should handle successful database operations', async () => {
      const response = await request(server)
        .get('/api/edge/database-edge-cases?operation=select');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('operation', 'select');
      expect(response.body).toHaveProperty('status', 'success');
    });

    test('should simulate database connection timeout', async () => {
      const response = await request(server)
        .get('/api/edge/database-edge-cases?simulate_error=connection_timeout');

      expect(response.status).toBe(504);
      expect(response.body).toHaveProperty('error', 'Database connection timeout');
    });

    test('should simulate database deadlock', async () => {
      const response = await request(server)
        .get('/api/edge/database-edge-cases?simulate_error=deadlock');

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Database deadlock detected');
    });

    test('should handle bulk insert operations', async () => {
      const response = await request(server)
        .get('/api/edge/database-edge-cases?operation=bulk_insert&records=5000');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('operation', 'bulk_insert');
      expect(response.body).toHaveProperty('records_inserted', 5000);
      expect(response.body).toHaveProperty('performance_metrics');
    });
  });

  describe('Cache Testing', () => {
    test('should handle cache operations', async () => {
      const response = await request(server)
        .get('/api/edge/cache-test?cache_key=test_key&ttl=600');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cache_key', 'test_key');
      expect(response.body).toHaveProperty('cache_hit');
      expect(response.body).toHaveProperty('ttl', 600);
      expect(response.body).toHaveProperty('cache_stats');
    });

    test('should reject cache request without key', async () => {
      const response = await request(server)
        .get('/api/edge/cache-test');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'cache_key is required');
    });
  });
});
