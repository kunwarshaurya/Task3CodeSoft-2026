import { jest } from '@jest/globals';
import request from 'supertest';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

// Set env vars before importing app
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.MONGODB_URI = 'mongodb://localhost/test'; // overridden by memory server
process.env.NODE_ENV = 'test';

let app;

beforeAll(async () => {
  await connectTestDB();
  // Dynamic import after DB is connected
  const mod = await import('../src/app.js');
  app = mod.default;
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

// ─── Helper ───
const registerAndLogin = async (userData = {}) => {
  const user = {
    name: userData.name || 'Test User',
    email: userData.email || 'test@example.com',
    password: userData.password || 'password123',
  };
  const res = await request(app).post('/api/v1/auth/register').send(user);
  return { user, token: res.body.data.token, userId: res.body.data.user._id };
};

// ═══════════════════════════════════════════════════════════════
//  AUTH TESTS
// ═══════════════════════════════════════════════════════════════

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/v1/auth/register').send({
        name: 'John', email: 'dup@example.com', password: 'password123',
      });
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Jane', email: 'dup@example.com', password: 'password456',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'John', email: 'notanemail', password: 'password123',
      });
      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'John', email: 'john@example.com', password: '12345',
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing name', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'john@example.com', password: 'password123',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      await registerAndLogin({ email: 'login@example.com' });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
      await registerAndLogin({ email: 'wrong@example.com' });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com',
        password: 'password123',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const { token } = await registerAndLogin({ email: 'me@example.com' });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('me@example.com');
    });

    it('should reject requests without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//  TASK TESTS
// ═══════════════════════════════════════════════════════════════

describe('Task Endpoints', () => {
  let token;

  beforeEach(async () => {
    const result = await registerAndLogin({ email: 'taskuser@example.com' });
    token = result.token;
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a task', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'My Task', priority: 'high', category: 'work' });

      expect(res.status).toBe(201);
      expect(res.body.data.task.title).toBe('My Task');
      expect(res.body.data.task.priority).toBe('high');
      expect(res.body.data.task.status).toBe('pending');
    });

    it('should reject task without title', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No title provided' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Sneaky task' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should return empty list initially', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return user tasks with pagination', async () => {
      // Create 3 tasks
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/v1/tasks')
          .set('Authorization', `Bearer ${token}`)
          .send({ title: `Task ${i}` });
      }

      const res = await request(app)
        .get('/api/v1/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks).toHaveLength(2);
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.totalPages).toBe(2);
      expect(res.body.meta.hasNextPage).toBe(true);
    });

    it('should filter tasks by status', async () => {
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Pending task', status: 'pending' });
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Completed task', status: 'completed' });

      const res = await request(app)
        .get('/api/v1/tasks?status=completed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.data.tasks).toHaveLength(1);
      expect(res.body.data.tasks[0].title).toBe('Completed task');
    });

    it('should filter tasks by priority', async () => {
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'High priority', priority: 'high' });
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Low priority', priority: 'low' });

      const res = await request(app)
        .get('/api/v1/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.data.tasks).toHaveLength(1);
      expect(res.body.data.tasks[0].priority).toBe('high');
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should get a single task', async () => {
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Single Task' });

      const taskId = createRes.body.data.task._id;
      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.task.title).toBe('Single Task');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/api/v1/tasks/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Task Ownership', () => {
    it('should not allow user to access another user\'s task', async () => {
      // Create task as first user
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'User 1 Task' });
      const taskId = createRes.body.data.task._id;

      // Register and login as second user
      const { token: token2 } = await registerAndLogin({
        email: 'other@example.com',
        name: 'Other User',
      });

      // Try to get first user's task
      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(404);
    });

    it('should not allow user to delete another user\'s task', async () => {
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Protected Task' });
      const taskId = createRes.body.data.task._id;

      const { token: token2 } = await registerAndLogin({
        email: 'attacker@example.com',
        name: 'Attacker',
      });

      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('should update task fields', async () => {
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Original Title' });
      const taskId = createRes.body.data.task._id;

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.data.task.title).toBe('Updated Title');
      expect(res.body.data.task.priority).toBe('high');
    });
  });

  describe('PATCH /api/v1/tasks/:id/status', () => {
    it('should update task status to completed and set completedAt', async () => {
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Complete Me' });
      const taskId = createRes.body.data.task._id;

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.data.task.status).toBe('completed');
      expect(res.body.data.task.completedAt).toBeDefined();
    });

    it('should reject invalid status', async () => {
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Status Test' });
      const taskId = createRes.body.data.task._id;

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task', async () => {
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Delete Me' });
      const taskId = createRes.body.data.task._id;

      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify it's gone
      const getRes = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

describe('Health Endpoint', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
