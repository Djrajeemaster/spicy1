// Notification and Communication Tests
const request = require('supertest');
const express = require('express');

function createNotificationTestServer() {
  const app = express();
  app.use(express.json());

  // Mock data
  const mockNotifications = [
    {
      id: 'notif-1',
      user_id: 'user-123',
      type: 'deal_liked',
      title: 'Your deal was liked!',
      message: 'Someone liked your deal "Amazing Electronics"',
      read: false,
      created_at: '2024-01-01T10:00:00Z'
    },
    {
      id: 'notif-2',
      user_id: 'user-123',
      type: 'comment_reply',
      title: 'New reply to your comment',
      message: 'Someone replied to your comment',
      read: true,
      created_at: '2024-01-01T09:00:00Z'
    }
  ];

  const mockPushTokens = [
    {
      id: 'token-1',
      token: 'expo-push-token-123',
      user_id: 'user-123',
      platform: 'ios',
      device_id: 'device-123',
      disabled: false
    }
  ];

  const mockComments = [
    {
      id: 'comment-1',
      deal_id: 'deal-123',
      user_id: 'user-123',
      content: 'Great deal! Thanks for sharing.',
      parent_id: null,
      created_at: '2024-01-01T10:00:00Z',
      username: 'testuser'
    },
    {
      id: 'comment-2',
      deal_id: 'deal-123',
      user_id: 'user-456',
      content: 'You\'re welcome!',
      parent_id: 'comment-1',
      created_at: '2024-01-01T10:30:00Z',
      username: 'dealmaker'
    }
  ];

  // Notification endpoints
  app.get('/api/notifications/unread', (req, res) => {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.json([]);
    }

    const unreadNotifications = mockNotifications.filter(n => 
      n.user_id === sessionId && !n.read
    );
    res.json(unreadNotifications);
  });

  app.get('/api/notifications', (req, res) => {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { limit = 20, offset = 0 } = req.query;
    const userNotifications = mockNotifications
      .filter(n => n.user_id === sessionId)
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json(userNotifications);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const notification = mockNotifications.find(n => n.id === id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.read = true;
    res.json({ success: true });
  });

  app.put('/api/notifications/mark-all-read', (req, res) => {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    mockNotifications
      .filter(n => n.user_id === sessionId)
      .forEach(n => n.read = true);

    res.json({ success: true });
  });

  // Push token management
  app.post('/api/push-tokens', (req, res) => {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { token, platform, device_id, app_version } = req.body;
    
    if (!token || !platform) {
      return res.status(400).json({ error: 'Token and platform are required' });
    }

    // Check if token already exists
    const existingToken = mockPushTokens.find(t => t.token === token);
    if (existingToken) {
      existingToken.user_id = sessionId;
      existingToken.platform = platform;
      existingToken.device_id = device_id;
      existingToken.app_version = app_version;
    } else {
      mockPushTokens.push({
        id: `token-${mockPushTokens.length + 1}`,
        token,
        user_id: sessionId,
        platform,
        device_id,
        app_version,
        disabled: false,
        created_at: new Date().toISOString()
      });
    }

    res.json({ success: true });
  });

  app.delete('/api/push-tokens/:token', (req, res) => {
    const { token } = req.params;
    const tokenIndex = mockPushTokens.findIndex(t => t.token === token);
    
    if (tokenIndex === -1) {
      return res.status(404).json({ error: 'Token not found' });
    }

    mockPushTokens.splice(tokenIndex, 1);
    res.json({ success: true });
  });

  // Push notification sending
  app.post('/api/push/send', (req, res) => {
    const { user_id, title, body, data } = req.body;
    
    if (!user_id || !title || !body) {
      return res.status(400).json({ error: 'user_id, title, and body are required' });
    }

    // Find user's push tokens
    const userTokens = mockPushTokens.filter(t => 
      t.user_id === user_id && !t.disabled
    );

    if (userTokens.length === 0) {
      return res.status(404).json({ error: 'No push tokens found for user' });
    }

    // Mock sending push notification
    console.log(`Sending push notification to ${userTokens.length} devices`);
    console.log(`Title: ${title}, Body: ${body}`);

    res.json({ 
      success: true, 
      sent_count: userTokens.length,
      message: 'Push notification sent successfully' 
    });
  });

  app.post('/api/push/broadcast', (req, res) => {
    const { title, body, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const activeTokens = mockPushTokens.filter(t => !t.disabled);
    
    res.json({ 
      success: true, 
      sent_count: activeTokens.length,
      message: 'Broadcast notification sent successfully' 
    });
  });

  // Comment system
  app.get('/api/deals/:dealId/comments', (req, res) => {
    const { dealId } = req.params;
    const dealComments = mockComments.filter(c => c.deal_id === dealId);
    
    // Organize comments with replies
    const topLevelComments = dealComments.filter(c => !c.parent_id);
    const commentsWithReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: dealComments.filter(c => c.parent_id === comment.id)
    }));

    res.json(commentsWithReplies);
  });

  app.post('/api/deals/:dealId/comments', (req, res) => {
    const { dealId } = req.params;
    const sessionId = req.cookies?.session_id;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { content, parent_id } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment too long (max 1000 characters)' });
    }

    const newComment = {
      id: `comment-${mockComments.length + 1}`,
      deal_id: dealId,
      user_id: sessionId,
      content,
      parent_id: parent_id || null,
      created_at: new Date().toISOString(),
      username: 'testuser'
    };

    mockComments.push(newComment);
    res.status(201).json(newComment);
  });

  app.delete('/api/comments/:id', (req, res) => {
    const { id } = req.params;
    const sessionId = req.cookies?.session_id;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const comment = mockComments.find(c => c.id === id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only allow deletion by comment author or admin
    if (comment.user_id !== sessionId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    const commentIndex = mockComments.findIndex(c => c.id === id);
    mockComments.splice(commentIndex, 1);

    res.json({ success: true });
  });

  // User reporting system
  app.post('/api/reports', (req, res) => {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { reported_user_id, reported_content_id, content_type, reason, description } = req.body;
    
    if (!reported_user_id || !reason) {
      return res.status(400).json({ error: 'reported_user_id and reason are required' });
    }

    if (reported_user_id === sessionId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    const validReasons = ['spam', 'harassment', 'inappropriate', 'scam', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    const newReport = {
      id: `report-${Date.now()}`,
      reporter_id: sessionId,
      reported_user_id,
      reported_content_id,
      content_type,
      reason,
      description,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    res.status(201).json({ 
      success: true, 
      message: 'Report submitted successfully',
      report_id: newReport.id 
    });
  });

  return app;
}

describe('Notification and Communication Tests', () => {
  let server;

  beforeAll(() => {
    server = createNotificationTestServer();
  });

  describe('Notification System', () => {
    test('should fetch unread notifications', async () => {
      const response = await request(server)
        .get('/api/notifications/unread')
        .set('Cookie', 'session_id=user-123');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(n => !n.read)).toBe(true);
    });

    test('should return empty array for unauthenticated user', async () => {
      const response = await request(server)
        .get('/api/notifications/unread');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should fetch paginated notifications', async () => {
      const response = await request(server)
        .get('/api/notifications?limit=10&offset=0')
        .set('Cookie', 'session_id=user-123');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    test('should mark notification as read', async () => {
      const response = await request(server)
        .put('/api/notifications/notif-1/read');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should mark all notifications as read', async () => {
      const response = await request(server)
        .put('/api/notifications/mark-all-read')
        .set('Cookie', 'session_id=user-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should return 404 for non-existent notification', async () => {
      const response = await request(server)
        .put('/api/notifications/non-existent/read');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Notification not found');
    });
  });

  describe('Push Token Management', () => {
    test('should register push token', async () => {
      const response = await request(server)
        .post('/api/push-tokens')
        .set('Cookie', 'session_id=user-123')
        .send({
          token: 'expo-push-token-new',
          platform: 'ios',
          device_id: 'device-new',
          app_version: '1.0.0'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject token registration without authentication', async () => {
      const response = await request(server)
        .post('/api/push-tokens')
        .send({
          token: 'expo-push-token-new',
          platform: 'ios'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    test('should reject token registration with missing fields', async () => {
      const response = await request(server)
        .post('/api/push-tokens')
        .set('Cookie', 'session_id=user-123')
        .send({
          token: 'expo-push-token-new'
          // Missing platform
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token and platform are required');
    });

    test('should delete push token', async () => {
      const response = await request(server)
        .delete('/api/push-tokens/expo-push-token-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Push Notification Sending', () => {
    test('should send push notification to specific user', async () => {
      const response = await request(server)
        .post('/api/push/send')
        .send({
          user_id: 'user-123',
          title: 'Test Notification',
          body: 'This is a test notification',
          data: { type: 'deal_update' }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sent_count');
      expect(typeof response.body.sent_count).toBe('number');
    });

    test('should reject notification with missing fields', async () => {
      const response = await request(server)
        .post('/api/push/send')
        .send({
          user_id: 'user-123',
          title: 'Test Notification'
          // Missing body
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'user_id, title, and body are required');
    });

    test('should handle user with no push tokens', async () => {
      const response = await request(server)
        .post('/api/push/send')
        .send({
          user_id: 'user-no-tokens',
          title: 'Test Notification',
          body: 'Test body'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No push tokens found for user');
    });

    test('should send broadcast notification', async () => {
      const response = await request(server)
        .post('/api/push/broadcast')
        .send({
          title: 'Broadcast Notification',
          body: 'This is a broadcast to all users'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sent_count');
    });
  });

  describe('Comment System', () => {
    test('should fetch comments for deal', async () => {
      const response = await request(server)
        .get('/api/deals/deal-123/comments');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('content');
        expect(response.body[0]).toHaveProperty('username');
        expect(response.body[0]).toHaveProperty('replies');
        expect(Array.isArray(response.body[0].replies)).toBe(true);
      }
    });

    test('should create new comment', async () => {
      const response = await request(server)
        .post('/api/deals/deal-123/comments')
        .set('Cookie', 'session_id=user-123')
        .send({
          content: 'This is a test comment'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content', 'This is a test comment');
      expect(response.body).toHaveProperty('deal_id', 'deal-123');
    });

    test('should create reply to comment', async () => {
      const response = await request(server)
        .post('/api/deals/deal-123/comments')
        .set('Cookie', 'session_id=user-123')
        .send({
          content: 'This is a reply',
          parent_id: 'comment-1'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('parent_id', 'comment-1');
    });

    test('should reject comment without authentication', async () => {
      const response = await request(server)
        .post('/api/deals/deal-123/comments')
        .send({
          content: 'This should fail'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    test('should reject empty comment', async () => {
      const response = await request(server)
        .post('/api/deals/deal-123/comments')
        .set('Cookie', 'session_id=user-123')
        .send({
          content: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Comment content is required');
    });

    test('should reject comment that is too long', async () => {
      const longContent = 'a'.repeat(1001);
      const response = await request(server)
        .post('/api/deals/deal-123/comments')
        .set('Cookie', 'session_id=user-123')
        .send({
          content: longContent
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Comment too long (max 1000 characters)');
    });

    test('should delete own comment', async () => {
      const response = await request(server)
        .delete('/api/comments/comment-1')
        .set('Cookie', 'session_id=user-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject deletion of non-existent comment', async () => {
      const response = await request(server)
        .delete('/api/comments/non-existent')
        .set('Cookie', 'session_id=user-123');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Comment not found');
    });
  });

  describe('User Reporting System', () => {
    test('should submit user report', async () => {
      const response = await request(server)
        .post('/api/reports')
        .set('Cookie', 'session_id=user-123')
        .send({
          reported_user_id: 'user-456',
          reason: 'spam',
          description: 'User is posting spam content'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('report_id');
    });

    test('should reject report without authentication', async () => {
      const response = await request(server)
        .post('/api/reports')
        .send({
          reported_user_id: 'user-456',
          reason: 'spam'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    test('should reject self-reporting', async () => {
      const response = await request(server)
        .post('/api/reports')
        .set('Cookie', 'session_id=user-123')
        .send({
          reported_user_id: 'user-123',
          reason: 'spam'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Cannot report yourself');
    });

    test('should reject invalid reason', async () => {
      const response = await request(server)
        .post('/api/reports')
        .set('Cookie', 'session_id=user-123')
        .send({
          reported_user_id: 'user-456',
          reason: 'invalid_reason'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid reason');
    });

    test('should reject report with missing fields', async () => {
      const response = await request(server)
        .post('/api/reports')
        .set('Cookie', 'session_id=user-123')
        .send({
          reported_user_id: 'user-456'
          // Missing reason
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'reported_user_id and reason are required');
    });
  });
});
