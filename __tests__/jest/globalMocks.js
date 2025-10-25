jest.mock('../../schemas/user');
jest.mock('bcryptjs');
jest.mock('../../utils/s3/S3Methods', () => ({ writeToLog: jest.fn().mockResolvedValue(true) }));
jest.mock('../../utils/discord/infinityErrorBot', () => ({ Discord: { logError: jest.fn() } }));
jest.mock('../../utils/logMethods', () => ({ betterErrorLog: jest.fn() }));
jest.mock('../../utils/helperMethods', () => ({ addLogFileForNewUser: jest.fn().mockResolvedValue(true) }));
jest.mock('../../utils/CustomError', () => {
  return class CustomError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  };
});
