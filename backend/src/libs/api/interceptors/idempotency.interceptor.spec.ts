import { of, throwError } from 'rxjs';

import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
} from '@nestjs/common';

import { DatabaseService } from '@libs/database/database.service';

import { IdempotencyInterceptor } from './idempotency.interceptor';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    // Mock request object
    mockRequest = {
      headers: {},
      body: {},
      originalUrl: '/v1/test-endpoint',
      method: 'POST',
      path: '/v1/test-endpoint',
    };

    // Mock response object
    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    // Mock CallHandler
    mockCallHandler = {
      handle: jest.fn(),
    } as any;

    // Mock DatabaseService with Kysely query builder pattern
    const mockSelectFrom = jest.fn();
    const mockSelectAll = jest.fn();
    const mockWhere = jest.fn();
    const mockExecuteTakeFirst = jest.fn();
    const mockInsertInto = jest.fn();
    const mockValues = jest.fn();
    const mockExecute = jest.fn();

    mockSelectAll.mockReturnValue({
      where: mockWhere,
    });

    mockWhere.mockReturnValue({
      where: mockWhere,
      executeTakeFirst: mockExecuteTakeFirst,
    });

    mockSelectFrom.mockReturnValue({
      selectAll: mockSelectAll,
    });

    mockValues.mockReturnValue({
      execute: mockExecute,
    });

    mockInsertInto.mockReturnValue({
      values: mockValues,
    });

    mockDatabaseService = {
      kysely: {
        selectFrom: mockSelectFrom,
        insertInto: mockInsertInto,
      },
    } as any;

    interceptor = new IdempotencyInterceptor(mockDatabaseService);
  });

  describe('Missing idempotency key', () => {
    it('should throw BadRequestException when idempotency-key header is missing', async () => {
      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('New request (no existing idempotency key)', () => {
    beforeEach(() => {
      mockRequest.headers['idempotency-key'] = 'test-key-123';
      mockRequest.body = { amount: 100, currency: 'USD' };

      // No existing response found
      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(undefined);
      const mockWhere = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      });

      mockDatabaseService.kysely.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: mockWhere,
        }),
      });

      // Mock successful insertion
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService.kysely.insertInto = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          execute: mockExecute,
        }),
      });

      // Mock successful handler response
      mockCallHandler.handle.mockReturnValue(of({ success: true, id: 'tx-123' }));
    });

    it('should process request and store in database', async () => {
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await new Promise((resolve) => {
        observable.subscribe({
          next: (response) => {
            expect(response).toEqual({ success: true, id: 'tx-123' });
            resolve(true);
          },
        });
      });

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Idempotency-Key', 'test-key-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Idempotency-Replayed', 'false');
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should store request and response payloads in database', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      mockDatabaseService.kysely.insertInto = jest.fn().mockReturnValue({
        values: mockValues,
      });

      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await new Promise((resolve) => {
        observable.subscribe({
          complete: () => resolve(true),
        });
      });

      expect(mockDatabaseService.kysely.insertInto).toHaveBeenCalledWith('idempotencyKeys');
      expect(mockValues).toHaveBeenCalledWith({
        externalId: 'test-key-123',
        requestPayload: { amount: 100, currency: 'USD' },
        responsePayload: { success: true, id: 'tx-123' },
        statusCode: 200,
        endpoint: 'POST /v1/test-endpoint',
      });
    });
  });

  describe('Duplicate request with same body', () => {
    beforeEach(() => {
      mockRequest.headers['idempotency-key'] = 'test-key-123';
      mockRequest.body = { amount: 100, currency: 'USD' };

      // Existing response found with matching body
      const existingResponse = {
        externalId: 'test-key-123',
        endpoint: 'POST /v1/test-endpoint',
        requestPayload: { amount: 100, currency: 'USD' },
        responsePayload: { success: true, id: 'tx-123' },
        statusCode: 201,
        createdAt: new Date(),
      };

      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(existingResponse);
      const mockWhere = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      });

      mockDatabaseService.kysely.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: mockWhere,
        }),
      });
    });

    it('should return cached response', async () => {
      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await new Promise((resolve) => {
        observable.subscribe({
          next: (response) => {
            expect(response).toEqual({ success: true, id: 'tx-123' });
            resolve(true);
          },
        });
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Idempotency-Replayed', 'true');
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should handle same body with different key order', async () => {
      // Request has keys in different order
      mockRequest.body = { currency: 'USD', amount: 100 };

      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await new Promise((resolve) => {
        observable.subscribe({
          next: (response) => {
            expect(response).toEqual({ success: true, id: 'tx-123' });
            resolve(true);
          },
        });
      });

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Idempotency-Replayed', 'true');
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate request with different body', () => {
    beforeEach(() => {
      mockRequest.headers['idempotency-key'] = 'test-key-123';
      mockRequest.body = { amount: 200, currency: 'EUR' }; // Different body

      // Existing response found with different body
      const existingResponse = {
        externalId: 'test-key-123',
        endpoint: 'POST /v1/test-endpoint',
        requestPayload: { amount: 100, currency: 'USD' }, // Original body
        responsePayload: { success: true, id: 'tx-123' },
        statusCode: 201,
        createdAt: new Date(),
      };

      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(existingResponse);
      const mockWhere = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      });

      mockDatabaseService.kysely.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: mockWhere,
        }),
      });
    });

    it('should throw ConflictException', async () => {
      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler)).rejects.toThrow(
        ConflictException,
      );

      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler)).rejects.toThrow(
        'Idempotency key already used with different request body',
      );

      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should detect difference in nested objects', async () => {
      mockRequest.body = {
        amount: 100,
        currency: 'USD',
        metadata: { userId: 'user-456' },
      };

      const existingResponse = {
        externalId: 'test-key-123',
        endpoint: 'POST /v1/test-endpoint',
        requestPayload: {
          amount: 100,
          currency: 'USD',
          metadata: { userId: 'user-123' },
        },
        responsePayload: { success: true },
        statusCode: 201,
        createdAt: new Date(),
      };

      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(existingResponse);
      const mockWhere = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      });

      mockDatabaseService.kysely.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: mockWhere,
        }),
      });

      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockRequest.headers['idempotency-key'] = 'test-key-123';
      mockRequest.body = { amount: 100, currency: 'USD' };

      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(undefined);
      const mockWhere = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      });

      mockDatabaseService.kysely.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: mockWhere,
        }),
      });
    });

    it('should store 4xx errors in database', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      mockDatabaseService.kysely.insertInto = jest.fn().mockReturnValue({
        values: mockValues,
      });

      const error = new BadRequestException('Invalid amount');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await expect(
        new Promise((resolve, reject) => {
          observable.subscribe({
            error: (err) => reject(err),
          });
        }),
      ).rejects.toThrow('Invalid amount');

      expect(mockValues).toHaveBeenCalledWith({
        externalId: 'test-key-123',
        requestPayload: { amount: 100, currency: 'USD' },
        responsePayload: error.getResponse(),
        statusCode: 400,
        endpoint: 'POST /v1/test-endpoint',
      });
    });

    it('should not store 5xx errors in database', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ execute: mockExecute });
      mockDatabaseService.kysely.insertInto = jest.fn().mockReturnValue({
        values: mockValues,
      });

      const error = new Error('Database connection failed');
      (error as any).getStatus = () => 500;

      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await expect(
        new Promise((resolve, reject) => {
          observable.subscribe({
            error: (err) => reject(err),
          });
        }),
      ).rejects.toThrow('Database connection failed');

      expect(mockDatabaseService.kysely.insertInto).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty request body', async () => {
      mockRequest.headers['idempotency-key'] = 'test-key-empty';
      mockRequest.body = undefined;

      const existingResponse = {
        externalId: 'test-key-empty',
        endpoint: 'POST /v1/test-endpoint',
        requestPayload: {},
        responsePayload: { success: true },
        statusCode: 200,
        createdAt: new Date(),
      };

      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(existingResponse);
      const mockWhere = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      });

      mockDatabaseService.kysely.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: mockWhere,
        }),
      });

      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await new Promise((resolve) => {
        observable.subscribe({
          next: (response) => {
            expect(response).toEqual({ success: true });
            resolve(true);
          },
        });
      });

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Idempotency-Replayed', 'true');
    });

    it('should handle arrays in request body', async () => {
      mockRequest.headers['idempotency-key'] = 'test-key-array';
      mockRequest.body = { items: [1, 2, 3] };

      const existingResponse = {
        externalId: 'test-key-array',
        endpoint: 'POST /v1/test-endpoint',
        requestPayload: { items: [1, 2, 3] },
        responsePayload: { success: true },
        statusCode: 200,
        createdAt: new Date(),
      };

      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(existingResponse);
      const mockWhere = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      });

      mockDatabaseService.kysely.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: mockWhere,
        }),
      });

      const observable = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await new Promise((resolve) => {
        observable.subscribe({
          next: () => resolve(true),
        });
      });

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Idempotency-Replayed', 'true');
    });

    it('should detect difference in array order', async () => {
      mockRequest.headers['idempotency-key'] = 'test-key-array-order';
      mockRequest.body = { items: [3, 2, 1] }; // Different order

      const existingResponse = {
        externalId: 'test-key-array-order',
        endpoint: 'POST /v1/test-endpoint',
        requestPayload: { items: [1, 2, 3] }, // Original order
        responsePayload: { success: true },
        statusCode: 200,
        createdAt: new Date(),
      };

      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(existingResponse);
      const mockWhere = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      });

      mockDatabaseService.kysely.selectFrom = jest.fn().mockReturnValue({
        selectAll: jest.fn().mockReturnValue({
          where: mockWhere,
        }),
      });

      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
