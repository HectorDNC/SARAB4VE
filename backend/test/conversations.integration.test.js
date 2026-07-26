const request = require('supertest');
const { app } = require('../app');
const { query } = require('../db');

describe('Chat Module Integration Tests', () => {
  let citizenToken;
  let volunteerToken;
  let emergencyId;
  let accessToken;
  let conversationId;
  let messageId;

  beforeAll(async () => {
    // Limpiar datos de test
    await query('DELETE FROM messages WHERE id IN (SELECT m.id FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.emergency_id IN (SELECT id FROM emergencies WHERE requester_name = $1))', ['Test User']);
    await query('DELETE FROM conversations WHERE emergency_id IN (SELECT id FROM emergencies WHERE requester_name = $1)', ['Test User']);
    await query('DELETE FROM emergency_attendees WHERE emergency_id IN (SELECT id FROM emergencies WHERE requester_name = $1)', ['Test User']);
    await query('DELETE FROM emergencies WHERE requester_name = $1', ['Test User']);
    await query('DELETE FROM users WHERE email IN ($1, $2)', ['citizen@test.com', 'volunteer@test.com']);

    // Crear usuario ciudadano
    const citizenRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'citizen@test.com',
        password: 'password123',
        name: 'Test User',
        role: 'citizen'
      });
    citizenToken = citizenRes.body.token;

    // Crear usuario voluntario
    const volunteerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'volunteer@test.com',
        password: 'password123',
        name: 'Test Volunteer',
        role: 'volunteer'
      });
    volunteerToken = volunteerRes.body.token;

    // Crear emergencia (debería generar access_token)
    const emergencyRes = await request(app)
      .post('/api/emergencies')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Test Emergency',
        description: 'Test emergency for chat',
        latitude: 10.4806,
        longitude: -66.9036,
        urgency: 'alta',
        requesterName: 'Test User'
      });

    emergencyId = emergencyRes.body.data.id;
    accessToken = emergencyRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Limpiar datos de test
    await query('DELETE FROM messages WHERE id IN (SELECT m.id FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.emergency_id IN (SELECT id FROM emergencies WHERE requester_name = $1))', ['Test User']);
    await query('DELETE FROM conversations WHERE emergency_id IN (SELECT id FROM emergencies WHERE requester_name = $1)', ['Test User']);
    await query('DELETE FROM emergency_attendees WHERE emergency_id IN (SELECT id FROM emergencies WHERE requester_name = $1)', ['Test User']);
    await query('DELETE FROM emergencies WHERE requester_name = $1', ['Test User']);
    await query('DELETE FROM users WHERE email IN ($1, $2)', ['citizen@test.com', 'volunteer@test.com']);
  });

  describe('Conversation Creation', () => {
    it('should create conversation when volunteer accepts emergency', async () => {
      const res = await request(app)
        .post(`/api/emergencies/${emergencyId}/accept`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('id');
      
      // Verificar que se creó la conversación
      const convRes = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(convRes.statusCode).toBe(200);
      const conversations = convRes.body.data;
      const conversation = conversations.find(c => c.emergencyId === emergencyId);
      expect(conversation).toBeDefined();
      expect(conversation.status).toBe('active');
      
      conversationId = conversation.id;
    });

    it('should not create duplicate conversation on second accept', async () => {
      const convRes1 = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`);

      const count1 = convRes1.body.data.filter(c => c.emergencyId === emergencyId).length;

      // Intentar aceptar de nuevo (debería retornar la conversación existente)
      await request(app)
        .post(`/api/emergencies/${emergencyId}/accept`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({});

      const convRes2 = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`);

      const count2 = convRes2.body.data.filter(c => c.emergencyId === emergencyId).length;

      expect(count2).toBe(count1);
    });
  });

  describe('Message Sending (JWT Auth)', () => {
    it('should send message as volunteer', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ body: 'Hello from volunteer' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.body).toBe('Hello from volunteer');
      expect(res.body.data.senderUserId).toBeDefined();
      
      messageId = res.body.data.id;
    });

    it('should send message as citizen using JWT', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ body: 'Hello from citizen' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.body).toBe('Hello from citizen');
    });
  });

  describe('Message Sending (Access Token Auth)', () => {
    it('should send message using access token in query param', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages?t=${accessToken}`)
        .send({ body: 'Hello from citizen via token' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.body).toBe('Hello from citizen via token');
      expect(res.body.data.senderUserId).toBeNull();
    });

    it('should send message using access token in header', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('X-Citizen-Token', accessToken)
        .send({ body: 'Hello from citizen via header' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.body).toBe('Hello from citizen via header');
    });

    it('should reject invalid access token', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages?t=invalid_token`)
        .send({ body: 'Should fail' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Message Listing', () => {
    it('should list messages as volunteer', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should list messages as citizen via access token', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages?t=${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should support cursor-based pagination', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages?limit=2`)
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);

      if (res.body.data.length === 2) {
        const lastMessageId = res.body.data[res.body.data.length - 1].id;
        
        const res2 = await request(app)
          .get(`/api/conversations/${conversationId}/messages?cursor=${lastMessageId}&limit=2`)
          .set('Authorization', `Bearer ${volunteerToken}`);

        expect(res2.statusCode).toBe(200);
        expect(res2.body.data.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Message Marking as Read', () => {
    it('should mark message as read', async () => {
      const res = await request(app)
        .patch(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.readAt).toBeDefined();
    });

    it('should not mark message as read twice', async () => {
      const res = await request(app)
        .patch(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Access Control', () => {
    it('should reject unauthorized access to conversation', async () => {
      // Crear otro usuario
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other@test.com',
          password: 'password123',
          name: 'Other User',
          role: 'citizen'
        });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.statusCode).toBe(403);

      // Limpiar
      await query('DELETE FROM users WHERE email = $1', ['other@test.com']);
    });

    it('should reject access to non-existent conversation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/conversations/${fakeId}/messages`)
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Conversations Listing', () => {
    it('should list conversations for volunteer', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${volunteerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should list conversations for citizen via access token', async () => {
      const res = await request(app)
        .get(`/api/conversations/mine?t=${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });
});
