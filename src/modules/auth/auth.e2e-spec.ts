import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '@src/app.module';
import { setupApp } from '@src/setup';

import { ConfigService } from '@libs/config/config.service';


import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';

describe('AuthController', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<UserEntity>;
  let configService: ConfigService;
  let adminSecret: string;

  const generateTestUser = (): CreateUserDto => ({
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    password: 'password123',
  });

  const setAdminHeaders = () => ({
    'x-admin-key': adminSecret,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await setupApp(app);

    await app.init();

    userRepository = moduleFixture.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    configService = moduleFixture.get<ConfigService>(ConfigService);
    adminSecret = configService.adminSecret;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await userRepository.deleteAll();
  });

  describe('POST /v1/auth/user', () => {
    describe('Admin Guard Authentication', () => {
      const testUser = generateTestUser();

      it('should reject request without x-admin-key header', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/user')
          .send(testUser)
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Admin key is required');
          });
      });

      it('should reject request with incorrect x-admin-key header', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/user')
          .set('x-admin-key', 'wrong-key')
          .send(testUser)
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toBe('Invalid admin key');
          });
      });

      it('should accept request with correct x-admin-key header', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/user')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(201);
      });
    });

    describe('User Creation Success', () => {
      it('should create user with valid data', async () => {
        const testUser = generateTestUser();

        const response = await request(app.getHttpServer())
          .post('/v1/auth/user')
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

        const createdUser = await userRepository.findOne({
          where: { email: testUser.email },
        });

        expect(createdUser).toBeDefined();
        expect(createdUser!.email).toBe(testUser.email);
        expect(createdUser!.isActive).toBe(true);

        expect(createdUser!.password).not.toBe(testUser.password);
      });

      it('should set isActive to true by default', async () => {
        const testUser = generateTestUser();

        await request(app.getHttpServer())
          .post('/v1/auth/user')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(201);

        const createdUser = await userRepository.findOne({
          where: { email: testUser.email },
        });

        expect(createdUser!.isActive).toBe(true);
      });
    });

    describe('Duplicate Email', () => {
      it('should reject duplicate email addresses', async () => {
        const testUser = generateTestUser();

        // Create first user
        await request(app.getHttpServer())
          .post('/v1/auth/user')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(201);

        // Attempt to create second user with same email
        const response = await request(app.getHttpServer())
          .post('/v1/auth/user')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(409);

        expect(response.body.message).toBe('email_already_exists');

        // Verify only one user exists in database
        const userCount = await userRepository.count({
          where: { email: testUser.email },
        });
        expect(userCount).toBe(1);
      });
    });

    describe('Input Validation', () => {
      it('should reject invalid email format', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/user')
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

        return request(app.getHttpServer())
          .post('/v1/auth/user')
          .set(setAdminHeaders())
          .send(testUser)
          .expect(400);
      });

      it('should reject missing email', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/user')
          .set(setAdminHeaders())
          .send({
            password: 'password123',
          })
          .expect(400);
      });

      it('should reject missing password', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/user')
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
      await request(app.getHttpServer())
        .post('/v1/auth/user')
        .set(setAdminHeaders())
        .send(testUser)
        .expect(201);
    });

    describe('Successful Login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app.getHttpServer())
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
        const response = await request(app.getHttpServer())
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
        return request(app.getHttpServer())
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
        return request(app.getHttpServer())
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
        await userRepository.update({ email: testUser.email }, { isActive: false });

        return request(app.getHttpServer())
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
        return request(app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: 'invalid-email',
            password: 'password123',
          })
          .expect(400);
      });

      it('should reject missing email', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            password: 'password123',
          })
          .expect(400);
      });

      it('should reject missing password', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/login')
          .send({
            email: testUser.email,
          })
          .expect(400);
      });

      it('should reject empty request body', () => {
        return request(app.getHttpServer())
          .post('/v1/auth/login')
          .send({})
          .expect(400);
      });
    });
  });
});
