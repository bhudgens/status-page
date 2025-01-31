const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn()
}));

describe('validate-config', () => {
  let mockExit;
  let mockConsoleError;
  let mockConsoleLog;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  describe('schema validation', () => {
    test('validates correct configuration', () => {
      // Mock schema
      const schema = {
        type: 'object',
        required: ['systems'],
        properties: {
          systems: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'name', 'description'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      };

      // Mock valid systems config
      const systems = {
        systems: [
          {
            id: 'api',
            name: 'API Service',
            description: 'Main API service'
          }
        ]
      };

      fs.readFileSync
        .mockReturnValueOnce(JSON.stringify(schema))
        .mockReturnValueOnce(JSON.stringify(systems));

      require('../validate-config');

      expect(mockConsoleLog).toHaveBeenCalledWith('Configuration validation successful!');
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('detects missing required fields', () => {
      const schema = {
        type: 'object',
        required: ['systems'],
        properties: {
          systems: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'name', 'description'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      };

      const invalidSystems = {
        systems: [
          {
            id: 'api',
            // missing name and description
          }
        ]
      };

      fs.readFileSync
        .mockReturnValueOnce(JSON.stringify(schema))
        .mockReturnValueOnce(JSON.stringify(invalidSystems));

      require('../validate-config');

      expect(mockConsoleError).toHaveBeenCalledWith('Configuration validation failed:');
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("must have required property 'name'"));
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('detects invalid field types', () => {
      const schema = {
        type: 'object',
        required: ['systems'],
        properties: {
          systems: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string' }
              }
            }
          }
        }
      };

      const invalidSystems = {
        systems: [
          {
            id: 123 // should be string
          }
        ]
      };

      fs.readFileSync
        .mockReturnValueOnce(JSON.stringify(schema))
        .mockReturnValueOnce(JSON.stringify(invalidSystems));

      require('../validate-config');

      expect(mockConsoleError).toHaveBeenCalledWith('Configuration validation failed:');
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('must be string'));
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('file handling', () => {
    test('handles schema file read error', () => {
      fs.readFileSync.mockImplementationOnce(() => {
        throw new Error('Schema file not found');
      });

      require('../validate-config');

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error during validation:',
        'Schema file not found'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('handles config file read error', () => {
      fs.readFileSync
        .mockReturnValueOnce('{}') // schema file
        .mockImplementationOnce(() => {
          throw new Error('Config file not found');
        });

      require('../validate-config');

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error during validation:',
        'Config file not found'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('error handling', () => {
    test('handles invalid JSON in schema file', () => {
      fs.readFileSync.mockReturnValueOnce('invalid json');

      require('../validate-config');

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error during validation:',
        expect.stringContaining('Unexpected token')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('handles invalid JSON in config file', () => {
      fs.readFileSync
        .mockReturnValueOnce('{}') // valid schema
        .mockReturnValueOnce('invalid json');

      require('../validate-config');

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error during validation:',
        expect.stringContaining('Unexpected token')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('handles invalid schema format', () => {
      const invalidSchema = {
        type: 'invalid' // invalid schema type
      };

      fs.readFileSync
        .mockReturnValueOnce(JSON.stringify(invalidSchema))
        .mockReturnValueOnce('{}');

      require('../validate-config');

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error during validation:',
        expect.any(String)
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
