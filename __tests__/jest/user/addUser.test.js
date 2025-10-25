const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../testApp');

// =======================[ MOCKS ]=======================
jest.mock('../../../utils/s3/S3Methods', () => ({
  writeToLog: jest.fn().mockResolvedValue(true),
  addLogFileForNewUser: jest.fn().mockResolvedValue(true),
  renameUserLogFile: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../utils/logMethods', () => ({
  betterErrorLog: jest.fn(),
}));

jest.mock('../../../schemas/user', () => {
  const actual = jest.requireActual('../../../schemas/user');
  actual.findOne = jest.fn();
  return actual;
});

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

const User = require('../../../schemas/user');
const { writeToLog } = require('../../../utils/s3/S3Methods');
const { betterErrorLog } = require('../../../utils/logMethods');

// =======================[ TESTS ]=======================
describe('POST /add-user', () => {
  const fakeUser = {
    _id: '12345',
    username: 'testuser',
    name: 'Test User',
    password: 'hashedPassword',
    role: 'user',
    permissions: {
      navigation: {},
      products: {},
      orders: {},
      packaging: {},
      colors: {},
      categories: {},
      suppliers: {},
      couriers: {},
    },
    settings: {},
  };

  const userData = {
    user: {
      username: 'testuser',
      name: 'Test User',
      password: '1234',
      role: 'user',
      permissions: {
        navigation: {},
        products: {},
        orders: {},
        packaging: {},
        colors: {},
        categories: {},
        suppliers: {},
        couriers: {},
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(User.prototype, 'save').mockResolvedValue(fakeUser);
  });

  it('should add a new user successfully', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashedPassword');

    const res = await request(app).post('/user/add-user').send(userData);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Korisnik uspešno dodat');
    expect(User.prototype.save).toHaveBeenCalled();
    expect(app.locals.io.emit).toHaveBeenCalledWith('addUser', expect.objectContaining({ username: 'testuser' }));
    expect(writeToLog).toHaveBeenCalled();
  });

  it('should return error if username already exists', async () => {
    User.findOne.mockResolvedValue(fakeUser);

    const res = await request(app).post('/user/add-user').send(userData);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Korisnik sa tim korisničkim imenom već postoji!');
  });

  it('should handle unexpected errors', async () => {
    User.findOne.mockRejectedValue(new Error('DB error'));

    const res = await request(app).post('/user/add-user').send(userData);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Došlo je do problema prilikom dodavanja novog korisnika');
    expect(betterErrorLog).toHaveBeenCalled();
  });
});
