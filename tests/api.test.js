// API Integration Tests - Test server endpoints
const request = require('supertest');
const express = require('express');

// Mock database for testing
const mockPool = {
  query: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

// Import server after mocking
const server = require('../../server');

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/signup - should create new user', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] }); // Insert user

      const response = await request(server)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('POST /api/auth/signin - should authenticate user', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashedpassword',
          role: 'user'
        }]
      });

      const response = await request(server)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });

    test('GET /api/auth/session - should return session info', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          role: 'user'
        }]
      });

      const response = await request(server)
        .get('/api/auth/session')
        .set('Cookie', 'session_id=user-123');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('User Management Endpoints', () => {
    test('GET /api/users - should return filtered users', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', username: 'admin', role: 'admin' },
          { id: '2', username: 'user', role: 'user' }
        ]
      });

      const response = await request(server)
        .get('/api/users?role=admin');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/admin/admin-ban-user - should ban user with elevation', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check admin role
        .mockResolvedValueOnce({ rows: [] }); // Ban user

      const response = await request(server)
        .post('/api/admin/admin-ban-user')
        .set('Cookie', 'session_id=admin-123')
        .set('x-admin-elevation', 'valid-token')
        .send({
          user_id: 'user-123',
          reason: 'Test ban',
          ban_reason: 'Violation'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('POST /api/admin/admin-suspend-user - should suspend user', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(server)
        .post('/api/admin/admin-suspend-user')
        .set('Cookie', 'session_id=admin-123')
        .set('x-admin-elevation', 'valid-token')
        .send({
          user_id: 'user-123',
          reason: 'Test suspension',
          duration_days: 7
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Site Settings Endpoints', () => {
    test('GET /api/site/settings - should return site settings', async () => {
      const response = await request(server)
        .get('/api/site/settings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logoFilename');
      expect(response.body).toHaveProperty('headerTextColor');
    });

    test('POST /api/admin/site/settings - should update settings', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ role: 'superadmin' }] });

      const response = await request(server)
        .post('/api/admin/site/settings')
        .set('Cookie', 'session_id=admin-123')
        .send({
          logoFilename: 'new-logo.png',
          headerTextColor: '#000000'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Role Management', () => {
    test('GET /api/role-requests - should return role requests', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', user_id: 'user-123', role: 'moderator', status: 'pending' }
        ]
      });

      const response = await request(server)
        .get('/api/role-requests');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/role-requests - should create role request', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({ rows: [{ id: 'req-123' }] }); // Insert

      const response = await request(server)
        .post('/api/role-requests')
        .send({
          userId: 'user-123',
          role: 'moderator',
          reason: 'Want to help moderate'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('submitted successfully');
    });
  });

  afterAll(() => {
    server.close();
  });
});
