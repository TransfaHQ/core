import { EntityRepository } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';

import request from 'supertest';

import { setupTestContext } from '@src/test/helpers';

import { ConfigService } from '@libs/config/config.service';

import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { KeysEntity } from './entities/keys.entity';
import { UserEntity } from './entities/user.entity';

describe('AuthController', () => {
  const ctx = setupTestContext();
  let userRepository: EntityRepository<UserEntity>;
  let keysRepository: EntityRepository<KeysEntity>;
  let configService: ConfigService;
  let adminSecret: string;
  let passwordHash: string;

  const generateTestUser = (): CreateUserDto => ({
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    password: 'password123',
  });

  const setAdminHeaders = () => ({
    'x-admin-key': adminSecret,
  });

  beforeAll(async () => {
    userRepository = ctx.app.get(getRepositoryToken(UserEntity));
    keysRepository = ctx.app.get(getRepositoryToken(KeysEntity));
    configService = ctx.app.get(ConfigService);
    const authService = ctx.app.get(AuthService);
    passwordHash = await authService.hashPassword('password123');
    adminSecret = configService.adminSecret;
  });

  describe('POST /v1/auth/users', () => {
    describe('Admin Guard Authentication', () => {
      const testUser = generateTestUser();

      it('should reject request without x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .send(testUser)
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Admin key is required');
          });
      });

      it('should reject request with incorrect x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set('x-admin-key', 'wrong-key')
          .send(testUser)
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Invalid admin key');
          });
      });

      it('should accept request with correct x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(201);
      });
    });

    describe('User Creation Success', () => {
      it('should create user with valid data', async () => {
        const testUser = generateTestUser();

        const response = await request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(201);
        expect(response.body).toMatchObject({
          id: expect.any(String),
          email: testUser.email,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });

        expect(response.body.password).toBeUndefined();

        const createdUser = await userRepository.findOne({ email: testUser.email });

        expect(createdUser).toBeDefined();
        expect(createdUser!.email).toBe(testUser.email);
        expect(createdUser!.isActive).toBe(true);

        expect(createdUser!.password).not.toBe(testUser.password);
      });

      it('should set isActive to true by default', async () => {
        const testUser = generateTestUser();

        await request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(201);

        const createdUser = await userRepository.findOne({ email: testUser.email });

        expect(createdUser!.isActive).toBe(true);
      });
    });

    describe('Duplicate Email', () => {
      it('should reject duplicate email addresses', async () => {
        const testUser = generateTestUser();

        const user = new UserEntity({
          email: testUser.email,
          isActive: true,
          password: passwordHash,
        });
        await ctx.em.persist(user);

        // Attempt to create second user with same email
        const response = await request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(409);

        expect(response.body.message).toBe('email_already_exists');

        // Verify only one user exists in database
        const userCount = await userRepository.count({ email: testUser.email });
        expect(userCount).toBe(1);
      });
    });

    describe('Input Validation', () => {
      it('should reject invalid email format', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set(setAdminHeaders())
          .send({
            email: 'invalid-email',
            password: 'password123',
          })
          .expect(400);
      });

      it('should reject password shorter than 6 characters', () => {
        const testUser = generateTestUser();
        testUser.password = '12345'; // Only 5 characters

        return request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(400);
      });

      it('should reject missing email', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set(setAdminHeaders())
          .send({
            password: 'password123',
          })
          .expect(400);
      });

      it('should reject missing password', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/users')
          .set(setAdminHeaders())
          .send({
            email: 'test@example.com',
          })
          .expect(400);
      });
    });
  });

  describe('POST /v1/auth/login', () => {
    let testUser: CreateUserDto;

    beforeEach(async () => {
      testUser = generateTestUser();

      // Create a test user for login tests
      const user = new UserEntity({
        email: testUser.email,
        isActive: true,
        password: passwordHash,
      });
      await ctx.em.persist(user);
    });

    describe('Successful Login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(ctx.app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(200);

        expect(response.body).toMatchObject({
          token: expect.any(String),
        });

        expect(response.headers['set-cookie']).toBeDefined();
        const cookieHeader = response.headers['set-cookie'][0];
        expect(cookieHeader).toContain('access_token=');
        expect(cookieHeader).toContain('HttpOnly');
        expect(cookieHeader).toContain('Secure');
        expect(cookieHeader).toContain('SameSite=Strict');
      });

      it('should set secure HTTP-only cookie', async () => {
        const response = await request(ctx.app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(200);

        const cookieHeader = response.headers['set-cookie'][0];
        expect(cookieHeader).toContain('access_token=');
        expect(cookieHeader).toContain('HttpOnly');
        expect(cookieHeader).toContain('Secure');
        expect(cookieHeader).toContain('SameSite=Strict');
        expect(cookieHeader).toContain('Max-Age=');
      });
    });

    describe('Invalid Credentials', () => {
      it('should reject login with wrong password', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword',
          })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Invalid credentials');
          });
      });

      it('should reject login with non-existent email', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'password123',
          })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Invalid credentials');
          });
      });

      it('should reject login for inactive user', async () => {
        // Deactivate the user
        const user = await ctx.em.findOneOrFail(UserEntity, { email: testUser.email });
        user.isActive = false;
        await ctx.em.persist(user);

        return request(ctx.app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Account is inactive');
          });
      });
    });

    describe('Input Validation', () => {
      it('should reject invalid email format', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: 'invalid-email',
            password: 'password123',
          })
          .expect(400);
      });

      it('should reject missing email', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            password: 'password123',
          })
          .expect(400);
      });

      it('should reject missing password', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: testUser.email,
          })
          .expect(400);
      });

      it('should reject empty request body', () => {
        return request(ctx.app.getHttpServer()).post('/v1/auth/login').send({}).expect(400);
      });
    });
  });

  describe('POST /v1/auth/keys', () => {
    describe('Admin Guard Authentication', () => {
      it('should reject request without x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/keys')
          .send({})
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Admin key is required');
          });
      });

      it('should reject request with incorrect x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/keys')
          .set('x-admin-key', 'wrong-key')
          .send({})
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Invalid admin key');
          });
      });

      it('should accept request with correct x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .post('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({})
          .expect(201);
      });
    });

    describe('Key Creation Success', () => {
      it('should create key with generated secret', async () => {
        const response = await request(ctx.app.getHttpServer())
          .post('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({})
          .expect(201);

        expect(response.body).toMatchObject({
          id: expect.any(String),
          secret: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });

        // Secret should be a base64url string (32 bytes = ~43 chars in base64url)
        expect(response.body.secret).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(response.body.secret.length).toBeGreaterThan(40);

        // Verify key was created in database
        const createdKey = await keysRepository.findOne({ id: response.body.id });

        expect(createdKey).toBeDefined();
        expect(createdKey!.id).toBe(response.body.id);
        // Secret in DB should be hashed, not the plain text
        expect(createdKey!.secret).not.toBe(response.body.secret);
      });

      it('should generate unique secrets for multiple keys', async () => {
        const response1 = await request(ctx.app.getHttpServer())
          .post('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({})
          .expect(201);

        const response2 = await request(ctx.app.getHttpServer())
          .post('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({})
          .expect(201);

        expect(response1.body.secret).not.toBe(response2.body.secret);
        expect(response1.body.id).not.toBe(response2.body.id);
      });
    });
  });

  describe('DELETE /v1/auth/keys', () => {
    let createdKeyId: string;

    beforeEach(async () => {
      // Create a key to delete in tests
      const response = await request(ctx.app.getHttpServer())
        .post('/v1/auth/keys')
        .set(setAdminHeaders())
        .send({})
        .expect(201);

      createdKeyId = response.body.id;
    });

    describe('Admin Guard Authentication', () => {
      it('should reject request without x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .send({ id: createdKeyId })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Admin key is required');
          });
      });

      it('should reject request with incorrect x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set('x-admin-key', 'wrong-key')
          .send({ id: createdKeyId })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Invalid admin key');
          });
      });

      it('should accept request with correct x-admin-key header', () => {
        return request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({ id: createdKeyId })
          .expect(204);
      });
    });

    describe('Key Deletion Success', () => {
      it('should soft delete existing key', async () => {
        await request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({ id: createdKeyId })
          .expect(204);

        // Key should be soft deleted (deletedAt should be set)
        const deletedKey = await keysRepository.findOne({ id: createdKeyId });

        expect(deletedKey).toBeDefined();
        expect(deletedKey!.deletedAt).toBeDefined();
        expect(deletedKey!.deletedAt).toBeInstanceOf(Date);

        // Key should not be found in normal queries
        const activeKey = await keysRepository.findOne({ id: createdKeyId, deletedAt: null });

        expect(activeKey).toBeNull();
      });

      it('should return 404 for non-existent key', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';

        return request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({ id: fakeId })
          .expect(404)
          .expect((res) => {
            expect(res.body.message).toBe('Key not found');
          });
      });

      it('should return 404 when trying to delete already deleted key', async () => {
        // First deletion
        await request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({ id: createdKeyId })
          .expect(204);

        // Second deletion should fail
        return request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({ id: createdKeyId })
          .expect(404)
          .expect((res) => {
            expect(res.body.message).toBe('Key not found');
          });
      });
    });

    describe('Input Validation', () => {
      it('should reject invalid UUID format', () => {
        return request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({ id: 'invalid-uuid' })
          .expect(400);
      });

      it('should reject missing id', () => {
        return request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set(setAdminHeaders())
          .send({})
          .expect(400);
      });

      it('should reject empty request body', () => {
        return request(ctx.app.getHttpServer())
          .delete('/v1/auth/keys')
          .set(setAdminHeaders())
          .expect(400);
      });
    });
  });
});
