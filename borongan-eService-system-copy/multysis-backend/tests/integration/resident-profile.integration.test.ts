/**
 * Integration tests for resident profile picture update flow
 *
 * Tests:
 * 1. PUT /api/residents/me with picturePath returns 200 and saves the value
 * 2. POST /api/upload/resident/profile-picture/presign with non-image contentType returns 400
 * 3. POST /api/upload/resident/profile-picture/presign with valid image returns upload URL
 *
 * These tests use supertest to hit the actual API endpoints.
 * Supabase storage is mocked to avoid real uploads.
 */

import request from 'supertest';
import bcrypt from 'bcrypt';
import prisma from '../../src/config/database';
import { generateToken } from '../../src/utils/jwt';
import app from '../../src/index';

// Mock Supabase storage to avoid real uploads
jest.mock('../../src/utils/supabaseStorage', () => ({
  createUploadPresignedUrl: jest.fn().mockResolvedValue({
    uploadUrl: 'https://mocked-supabase-storage.example.com/upload',
    picturePath: 'residents/test-id/profile-picture.jpg',
  }),
  deleteFromSupabase: jest.fn().mockResolvedValue(undefined),
  getFileUrl: jest.fn().mockReturnValue('https://mocked-supabase-storage.example.com/file'),
}));

describe('Resident Profile Picture Update Flow Integration Tests', () => {
  let testResidentId: string;
  let testResidentToken: string;

  beforeAll(async () => {
    // Create test resident (required fields: lastName, firstName, birthdate)
    const resident = await prisma.resident.create({
      data: {
        firstName: 'Test',
        lastName: 'Resident',
        username: `testresident_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        birthdate: new Date('1990-01-15'),
        status: 'active',
      },
    });
    testResidentId = resident.id;

    // Create resident credentials with hashed password
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    await prisma.residentCredential.create({
      data: {
        residentFk: testResidentId,
        password: hashedPassword,
      },
    });

    // Generate JWT token for the test resident
    testResidentToken = generateToken({
      id: testResidentId,
      username: resident.username,
      role: 'resident',
      type: 'resident',
    });
  });

  afterAll(async () => {
    // Clean up test data (credential cascade deletes with resident)
    if (testResidentId) {
      await prisma.resident.delete({
        where: { id: testResidentId },
      }).catch(() => {/* ignore if already deleted */});
    }
    await prisma.$disconnect();
  });

  describe('PUT /api/residents/me - Update own profile', () => {
    it('should return 200 and save picturePath when updating own profile', async () => {
      const newPicturePath = 'https://example.com/new-profile-picture.jpg';

      const response = await request(app)
        .put('/api/residents/me')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({ picturePath: newPicturePath });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('picturePath');
      expect(response.body.data.picturePath).toBe(newPicturePath);
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .put('/api/residents/me')
        .send({ picturePath: 'https://example.com/test.jpg' });

      expect(response.status).toBe(401);
    });

    it('should return 200 when updating other allowed fields along with picturePath', async () => {
      const response = await request(app)
        .put('/api/residents/me')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          picturePath: 'https://example.com/updated-picture.jpg',
          occupation: 'Software Engineer',
          educationAttainment: 'College Graduate',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('picturePath');
      expect(response.body.data.picturePath).toBe('https://example.com/updated-picture.jpg');
    });
  });

  describe('POST /api/upload/resident/profile-picture/presign - Generate presigned URL', () => {
    it('should return 400 when contentType is not an image', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          fileName: 'document.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid content type');
    });

    it('should return 400 when contentType is text/plain', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          fileName: 'readme.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 200 and upload URL when contentType is valid image (jpeg)', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          fileName: 'profile.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('uploadUrl');
      expect(response.body.data).toHaveProperty('picturePath');
      expect(response.body.data.uploadUrl).toBe('https://mocked-supabase-storage.example.com/upload');
    });

    it('should return 200 and upload URL when contentType is valid image (png)', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          fileName: 'profile.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.uploadUrl).toBeDefined();
    });

    it('should return 200 and upload URL when contentType is valid image (webp)', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          fileName: 'profile.webp',
          contentType: 'image/webp',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.uploadUrl).toBeDefined();
    });

    it('should return 200 and upload URL when contentType is valid image (gif)', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          fileName: 'profile.gif',
          contentType: 'image/gif',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.uploadUrl).toBeDefined();
    });

    it('should return 400 when fileName is missing', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('fileName and contentType are required');
    });

    it('should return 400 when contentType is missing', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          fileName: 'profile.jpg',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .send({
          fileName: 'profile.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Profile Picture Update Flow', () => {
    it('should complete full flow: generate presigned URL then update profile with picturePath', async () => {
      // Step 1: Generate presigned URL
      const presignResponse = await request(app)
        .post('/api/upload/resident/profile-picture/presign')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({
          fileName: 'new-profile.jpg',
          contentType: 'image/jpeg',
        });

      expect(presignResponse.status).toBe(200);
      expect(presignResponse.body.data.picturePath).toBeDefined();

      const picturePath = presignResponse.body.data.picturePath;

      // Step 2: Update profile with the picturePath from presigned URL
      const updateResponse = await request(app)
        .put('/api/residents/me')
        .set('Authorization', `Bearer ${testResidentToken}`)
        .send({ picturePath });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.picturePath).toBe(picturePath);
    });
  });
});