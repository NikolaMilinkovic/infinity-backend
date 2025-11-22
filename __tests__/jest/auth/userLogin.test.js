const request = require('supertest');
const app = require('../testApp');
const User = require('../../../schemas/user');
const bcrypt = require('bcryptjs');

// =======================[ LOGIN ROUTE TEST ]=======================
describe('POST /login', () => {
  const fakeUser = {
    _id: '12345',
    email: 'helvos',
    password: 'hashedPassword',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // LOGIN SUCCESS
  it('should login successfully with correct credentials', async () => {
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post('/login').send({ email: 'helvos', password: '1234' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.message).toBe('Uspešno logovanje na sistem.');
  });

  // LOGIN FAIL - email NOT FOUND
  it('should fail login if email not found', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post('/login').send({ email: 'wrong', password: '1234' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  // LOGIN FAIL - INCORRECT PASSWORD
  it('should fail login if password is incorrect', async () => {
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/login').send({ email: 'nikola', password: 'wrongpass' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
