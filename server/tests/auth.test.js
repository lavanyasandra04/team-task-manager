const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');

beforeAll(async () => {
  // Clean test data
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/signup', () => {
  it('creates a new user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'test@test.com',
      password: 'Password1',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('test@test.com');
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'test@test.com',
      password: 'Password1',
    });
    expect(res.status).toBe(409);
  });

  it('validates password strength', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test',
      email: 'weak@test.com',
      password: 'weak',
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});

describe('POST /api/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'Password1',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'WrongPass1',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'Password1',
    });
    expect(res.status).toBe(401);
  });
});