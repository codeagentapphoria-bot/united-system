import { Response } from 'express';
import {
  createTaxProfileController,
  getTaxProfilesController,
  getTaxProfileController,
  updateTaxProfileController,
  deleteTaxProfileController,
  getTaxProfileVersionsController,
  createTaxProfileVersionController,
  activateTaxProfileVersionController,
  getTaxComputationController,
  computeTaxController,
} from '../tax-profile.controller';
import * as taxProfileService from '../../services/tax-profile.service';
import * as taxComputationService from '../../services/tax-computation.service';
import { AuthRequest } from '../../middleware/auth';

// Mock services
jest.mock('../../services/tax-profile.service');
jest.mock('../../services/tax-computation.service');

const mockedTaxProfileService = taxProfileService as jest.Mocked<typeof taxProfileService>;
const mockedTaxComputationService = taxComputationService as jest.Mocked<
  typeof taxComputationService
>;

describe('Tax Profile Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    mockStatus = jest.fn().mockReturnThis();
    mockJson = jest.fn().mockReturnThis();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'user-1',
        email: 'admin@test.com',
        role: 'admin',
        type: 'admin',
      },
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('createTaxProfileController', () => {
    it('should create tax profile successfully', async () => {
      const taxProfileData = {
        serviceId: 'service-1',
        name: 'RPTAX Residential',
        variant: 'Residential',
        isActive: true,
      };

      const createdProfile = {
        id: 'profile-1',
        ...taxProfileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = taxProfileData;
      mockedTaxProfileService.createTaxProfile.mockResolvedValue(createdProfile as any);

      await createTaxProfileController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.createTaxProfile).toHaveBeenCalledWith(taxProfileData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: createdProfile,
      });
    });

    it('should handle errors', async () => {
      mockRequest.body = { serviceId: 'invalid' };
      mockedTaxProfileService.createTaxProfile.mockRejectedValue(new Error('Service not found'));

      await createTaxProfileController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Service not found',
      });
    });
  });

  describe('getTaxProfilesController', () => {
    it('should get tax profiles with filters and pagination', async () => {
      const taxProfiles = [
        {
          id: 'profile-1',
          name: 'RPTAX Residential',
          service: { id: 'service-1', code: 'RPTAX', name: 'Real Property Tax' },
        },
      ];

      const pagination = {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      };

      mockRequest.query = {
        page: '1',
        limit: '10',
        serviceId: 'service-1',
        isActive: 'true',
        search: 'RPTAX',
      };

      mockedTaxProfileService.getTaxProfiles.mockResolvedValue({
        taxProfiles: taxProfiles as any,
        pagination,
      });

      await getTaxProfilesController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.getTaxProfiles).toHaveBeenCalledWith(
        {
          serviceId: 'service-1',
          isActive: true,
          search: 'RPTAX',
        },
        {
          page: 1,
          limit: 10,
        }
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: taxProfiles,
        pagination,
      });
    });

    it('should handle default pagination', async () => {
      mockRequest.query = {};
      mockedTaxProfileService.getTaxProfiles.mockResolvedValue({
        taxProfiles: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await getTaxProfilesController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.getTaxProfiles).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 10 }
      );
    });
  });

  describe('getTaxProfileController', () => {
    it('should get tax profile by ID', async () => {
      const taxProfile = {
        id: 'profile-1',
        name: 'RPTAX Residential',
        service: { id: 'service-1', code: 'RPTAX', name: 'Real Property Tax' },
        versions: [],
      };

      mockRequest.params = { id: 'profile-1' };
      mockedTaxProfileService.getTaxProfile.mockResolvedValue(taxProfile as any);

      await getTaxProfileController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.getTaxProfile).toHaveBeenCalledWith('profile-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: taxProfile,
      });
    });

    it('should return 404 when tax profile not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockedTaxProfileService.getTaxProfile.mockRejectedValue(new Error('Tax profile not found'));

      await getTaxProfileController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Tax profile not found',
      });
    });
  });

  describe('updateTaxProfileController', () => {
    it('should update tax profile successfully', async () => {
      const updatedProfile = {
        id: 'profile-1',
        name: 'RPTAX Commercial',
        variant: 'Commercial',
        isActive: true,
      };

      mockRequest.params = { id: 'profile-1' };
      mockRequest.body = { name: 'RPTAX Commercial' };
      mockedTaxProfileService.updateTaxProfile.mockResolvedValue(updatedProfile as any);

      await updateTaxProfileController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.updateTaxProfile).toHaveBeenCalledWith('profile-1', {
        name: 'RPTAX Commercial',
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: updatedProfile,
      });
    });
  });

  describe('deleteTaxProfileController', () => {
    it('should delete tax profile successfully', async () => {
      mockRequest.params = { id: 'profile-1' };
      mockedTaxProfileService.deleteTaxProfile.mockResolvedValue(undefined);

      await deleteTaxProfileController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.deleteTaxProfile).toHaveBeenCalledWith('profile-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        message: 'Tax profile deleted successfully',
      });
    });
  });

  describe('getTaxProfileVersionsController', () => {
    it('should get tax profile versions', async () => {
      const versions = [
        {
          id: 'version-1',
          version: '1.0.0',
          status: 'ACTIVE',
        },
      ];

      mockRequest.params = { id: 'profile-1' };
      mockedTaxProfileService.getTaxProfileVersions.mockResolvedValue(versions as any);

      await getTaxProfileVersionsController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.getTaxProfileVersions).toHaveBeenCalledWith('profile-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: versions,
      });
    });
  });

  describe('createTaxProfileVersionController', () => {
    it('should create version with date conversion', async () => {
      const versionData = {
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        effectiveTo: '2026-12-31T00:00:00.000Z',
        changeReason: 'Initial version',
        configuration: {
          inputs: [],
          derivedValues: [],
          finalTax: { formula: '0' },
        },
      };

      const createdVersion = {
        id: 'version-1',
        version: '1.0.0',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: new Date('2026-12-31'),
        status: 'DRAFT',
      };

      mockRequest.params = { id: 'profile-1' };
      mockRequest.body = versionData;
      mockedTaxProfileService.createTaxProfileVersion.mockResolvedValue(createdVersion as any);

      await createTaxProfileVersionController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.createTaxProfileVersion).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({
          effectiveFrom: expect.any(Date),
          effectiveTo: expect.any(Date),
          changeReason: 'Initial version',
          createdBy: 'user-1',
        })
      );
      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should handle invalid date strings', async () => {
      mockRequest.params = { id: 'profile-1' };
      mockRequest.body = {
        effectiveFrom: 'invalid-date',
        changeReason: 'Test',
        configuration: {},
      };

      await createTaxProfileVersionController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid effective from date',
      });
    });

    it('should use current date if effectiveFrom not provided', async () => {
      const createdVersion = {
        id: 'version-1',
        version: '1.0.0',
        status: 'DRAFT',
      };

      mockRequest.params = { id: 'profile-1' };
      mockRequest.body = {
        changeReason: 'Test',
        configuration: {},
      };
      mockedTaxProfileService.createTaxProfileVersion.mockResolvedValue(createdVersion as any);

      await createTaxProfileVersionController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxProfileService.createTaxProfileVersion).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({
          effectiveFrom: expect.any(Date),
          createdBy: 'user-1',
        })
      );
    });
  });

  describe('activateTaxProfileVersionController', () => {
    it('should activate version successfully', async () => {
      const activatedVersion = {
        id: 'version-1',
        version: '1.0.0',
        status: 'ACTIVE',
      };

      mockRequest.params = { id: 'version-1' };
      mockedTaxProfileService.activateTaxProfileVersion.mockResolvedValue(activatedVersion as any);

      await activateTaxProfileVersionController(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockedTaxProfileService.activateTaxProfileVersion).toHaveBeenCalledWith('version-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: activatedVersion,
      });
    });
  });

  describe('getTaxComputationController', () => {
    it('should get active tax computation', async () => {
      const computation = {
        id: 'computation-1',
        transactionId: 'transaction-1',
        totalTax: 1000,
        isActive: true,
      };

      mockRequest.params = { id: 'transaction-1' };
      mockedTaxComputationService.getActiveTaxComputation.mockResolvedValue(computation as any);

      await getTaxComputationController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxComputationService.getActiveTaxComputation).toHaveBeenCalledWith(
        'transaction-1'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: computation,
      });
    });

    it('should return 404 when computation not found', async () => {
      mockRequest.params = { id: 'transaction-1' };
      mockedTaxComputationService.getActiveTaxComputation.mockResolvedValue(null);

      await getTaxComputationController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Tax computation not found',
      });
    });
  });

  describe('computeTaxController', () => {
    it('should compute tax for transaction', async () => {
      const computation = {
        id: 'computation-1',
        transactionId: 'transaction-1',
        totalTax: 1000,
        isActive: true,
      };

      mockRequest.params = { id: 'transaction-1' };
      mockedTaxComputationService.computeTaxForTransaction.mockResolvedValue(computation as any);

      await computeTaxController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockedTaxComputationService.computeTaxForTransaction).toHaveBeenCalledWith(
        'transaction-1',
        'user-1'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: computation,
      });
    });

    it('should handle errors', async () => {
      mockRequest.params = { id: 'transaction-1' };
      mockedTaxComputationService.computeTaxForTransaction.mockRejectedValue(
        new Error('Transaction not found')
      );

      await computeTaxController(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Transaction not found',
      });
    });
  });
});
