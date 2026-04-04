import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getFilePath, getFileUrl } from '../middleware/upload';
import { emitNewSubscriber, emitSubscriberUpdate } from '../services/socket.service';
import {
    activateSubscriber,
    blockSubscriber,
    changeSubscriberPassword,
    createSubscriber,
    deactivateSubscriber,
    getSubscriber,
    getSubscribers,
    getSubscriberTransactions,
    searchCitizensForLinking,
    updateSubscriber,
} from '../services/subscriber.service';

// Helper function to transform subscriber gateway with URLs and merge personal info
const transformSubscriberWithUrls = (subscriberGateway: any) => {
  // Merge data from either Citizen or NonCitizen based on gateway type
  if (subscriberGateway.type === 'CITIZEN' && subscriberGateway.citizen) {
    // Data comes from Citizen - NO data in NonCitizen
    const citizen = subscriberGateway.citizen;
    // Exclude password from subscriberGateway spread (password is in Subscriber table, not exposed in API)
    const { password, ...subscriberGatewayWithoutPassword } = subscriberGateway;
    const transformed = {
      ...subscriberGatewayWithoutPassword,
      id: subscriberGateway.id,
      firstName: citizen.firstName,
      middleName: citizen.middleName,
      lastName: citizen.lastName,
      extensionName: citizen.extensionName,
      email: citizen.email,
      phoneNumber: citizen.phoneNumber,
      birthDate: citizen.birthDate,
      civilStatus: citizen.civilStatus,
      sex: citizen.sex,
      residentId: citizen.residentId,
      profilePicture: citizen.citizenPicture ? getFileUrl(citizen.citizenPicture) : null,
      status: 'ACTIVE', // Citizens are always active
      // Include person object for frontend compatibility
      person: {
        type: 'CITIZEN' as const,
        citizenId: subscriberGateway.citizenId,
        citizen: {
          ...citizen,
          citizenPicture: citizen.citizenPicture ? getFileUrl(citizen.citizenPicture) : null,
          proofOfResidency: citizen.proofOfResidency ? getFileUrl(citizen.proofOfResidency) : null,
          proofOfIdentification: citizen.proofOfIdentification
            ? getFileUrl(citizen.proofOfIdentification)
            : null,
          citizenPlaceOfBirth:
            citizen.placeOfBirth && citizen.placeOfBirth.length > 0
              ? {
                  region: citizen.placeOfBirth[0].region,
                  province: citizen.placeOfBirth[0].province,
                  municipality: citizen.placeOfBirth[0].municipality,
                }
              : null,
        },
      },
      citizen: {
        ...citizen,
        citizenPicture: citizen.citizenPicture ? getFileUrl(citizen.citizenPicture) : null,
        proofOfResidency: citizen.proofOfResidency ? getFileUrl(citizen.proofOfResidency) : null,
        proofOfIdentification: citizen.proofOfIdentification
          ? getFileUrl(citizen.proofOfIdentification)
          : null,
        citizenPlaceOfBirth:
          citizen.placeOfBirth && citizen.placeOfBirth.length > 0
            ? {
                region: citizen.placeOfBirth[0].region,
                province: citizen.placeOfBirth[0].province,
                municipality: citizen.placeOfBirth[0].municipality,
              }
            : null,
      },
      // Map structured address fields for frontend compatibility
      addressRegion: citizen.addressRegion,
      addressProvince: citizen.addressProvince,
      addressMunicipality: citizen.addressMunicipality,
      addressBarangay: citizen.addressBarangay,
      addressStreetAddress: citizen.addressStreetAddress,
      addressPostalCode: citizen.addressPostalCode,
      placeOfBirth:
        citizen.placeOfBirth && citizen.placeOfBirth.length > 0
          ? {
              region: citizen.placeOfBirth[0].region,
              province: citizen.placeOfBirth[0].province,
              municipality: citizen.placeOfBirth[0].municipality,
            }
          : null,
    };
    return transformed;
  } else if (subscriberGateway.type === 'SUBSCRIBER' && subscriberGateway.nonCitizen) {
    // Data comes from NonCitizen
    const nonCitizen = subscriberGateway.nonCitizen;
    // Exclude password from subscriberGateway spread (password is in Subscriber table, not exposed in API)
    const { password, ...subscriberGatewayWithoutPassword } = subscriberGateway;
    const transformed = {
      ...subscriberGatewayWithoutPassword,
      id: subscriberGateway.id,
      firstName: nonCitizen.firstName,
      middleName: nonCitizen.middleName,
      lastName: nonCitizen.lastName,
      extensionName: nonCitizen.extensionName,
      email: nonCitizen.email,
      phoneNumber: nonCitizen.phoneNumber,
      // Password intentionally excluded from API response
      status: nonCitizen.status,
      residentId: nonCitizen.residentId,
      residencyType: nonCitizen.residencyType,
      residencyStatus: nonCitizen.residencyStatus,
      profilePicture: nonCitizen.profilePicture ? getFileUrl(nonCitizen.profilePicture) : null,
      birthDate: nonCitizen.birthDate,
      civilStatus: nonCitizen.civilStatus,
      sex: nonCitizen.sex,
      residentAddress: nonCitizen.residentAddress,
      placeOfBirth: nonCitizen.placeOfBirth,
      motherInfo: nonCitizen.motherInfo,
      // Include person object for frontend compatibility
      person: {
        type: 'SUBSCRIBER' as const,
        nonCitizenId: subscriberGateway.nonCitizenId,
      },
      nonCitizen: {
        ...nonCitizen,
        // Password is no longer in NonCitizen table - it's in Subscriber table
        // Exclude password from response (it doesn't exist in nonCitizen anymore)
        profilePicture: nonCitizen.profilePicture ? getFileUrl(nonCitizen.profilePicture) : null,
      },
    };
    return transformed;
  }

  // Fallback - return as-is but ensure person property exists
  // Exclude password from subscriberGateway spread (password is in Subscriber table, not exposed in API)
  const { password, ...subscriberGatewayWithoutPassword } = subscriberGateway;
  return {
    ...subscriberGatewayWithoutPassword,
    person: {
      type: subscriberGateway.type || 'SUBSCRIBER',
      citizenId: subscriberGateway.citizenId,
      nonCitizenId: subscriberGateway.nonCitizenId,
    },
  };
};

export const createSubscriberController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const file = req.file;
    const subscriberData = { ...req.body };

    // Add profile picture path if file was uploaded (store relative path in DB)
    if (file) {
      subscriberData.profilePicture = getFilePath(file.filename, 'image');
    }

    const subscriber = await createSubscriber(subscriberData);

    // Transform relative paths to full URLs for API response
    const subscriberWithUrl = transformSubscriberWithUrls(subscriber);

    // Emit WebSocket event for new subscriber
    emitNewSubscriber({
      id: subscriberWithUrl.id,
      firstName: subscriberWithUrl.firstName,
      middleName: subscriberWithUrl.middleName,
      lastName: subscriberWithUrl.lastName,
      extensionName: subscriberWithUrl.extensionName,
      phoneNumber: subscriberWithUrl.phoneNumber,
      email: subscriberWithUrl.email,
      status: subscriberWithUrl.status,
      type: subscriberWithUrl.type || 'SUBSCRIBER',
      createdAt: subscriber.createdAt || new Date(),
    });

    res.status(201).json({
      status: 'success',
      data: subscriberWithUrl,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create subscriber',
    });
  }
};

export const getSubscribersController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const residencyFilter = req.query.residencyFilter as 'all' | 'resident' | 'non-resident';
    const status = req.query.status as string;

    const result = await getSubscribers({ search, residencyFilter, status }, { page, limit });

    // Transform relative paths to full URLs for API response
    const subscribersWithUrls = result.subscribers.map((subscriber: any) =>
      transformSubscriberWithUrls(subscriber)
    );

    res.status(200).json({
      status: 'success',
      data: subscribersWithUrls,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch subscribers',
    });
  }
};

export const getSubscriberController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subscriberId = req.params.id;

    console.log('getSubscriberController called with ID:', subscriberId);
    console.log('User:', req.user);

    // Verify ownership for subscribers - they can only access their own profile
    if (req.user?.type === 'subscriber' && subscriberId !== req.user.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only access your own profile.',
      });
      return;
    }

    const subscriber = await getSubscriber(subscriberId);

    if (!subscriber) {
      res.status(404).json({
        status: 'error',
        message: 'Subscriber not found',
      });
      return;
    }

    // Transform relative paths to full URLs for API response
    const subscriberWithUrl = transformSubscriberWithUrls(subscriber);

    res.status(200).json({
      status: 'success',
      data: subscriberWithUrl,
    });
  } catch (error: any) {
    console.error('Error in getSubscriberController:', error);
    console.error('Error stack:', error.stack);
    res.status(404).json({
      status: 'error',
      message: error.message || 'Subscriber not found',
    });
  }
};

export const updateSubscriberController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const subscriberId = req.params.id;

    // Verify ownership for subscribers - they can only update their own profile
    if (req.user?.type === 'subscriber' && subscriberId !== req.user.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only update your own profile.',
      });
      return;
    }

    const file = req.file;
    const updateData = { ...req.body };

    // Add profile picture path if file was uploaded (store relative path in DB)
    if (file) {
      updateData.profilePicture = getFilePath(file.filename, 'image');
    }

    const subscriber = await updateSubscriber(subscriberId, updateData);

    // Transform relative paths to full URLs for API response
    const subscriberWithUrl = transformSubscriberWithUrls(subscriber);

    // Emit WebSocket event for subscriber profile update
    emitSubscriberUpdate(subscriberId, {
      status: subscriberWithUrl.status,
      updatedAt: new Date(),
    });

    res.status(200).json({
      status: 'success',
      data: subscriberWithUrl,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update subscriber',
    });
  }
};

export const activateSubscriberController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const subscriber = await activateSubscriber(req.params.id);
    const subscriberWithUrl = transformSubscriberWithUrls(subscriber);

    // Emit WebSocket event for subscriber status update
    emitSubscriberUpdate(req.params.id, {
      status: subscriberWithUrl.status || 'ACTIVE',
      updatedAt: new Date(),
    });

    res.status(200).json({
      status: 'success',
      data: subscriberWithUrl,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to activate subscriber',
    });
  }
};

export const deactivateSubscriberController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const subscriber = await deactivateSubscriber(req.params.id);
    const subscriberWithUrl = transformSubscriberWithUrls(subscriber);

    // Emit WebSocket event for subscriber status update
    emitSubscriberUpdate(req.params.id, {
      status: subscriberWithUrl.status || 'EXPIRED',
      updatedAt: new Date(),
    });

    res.status(200).json({
      status: 'success',
      data: subscriberWithUrl,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to deactivate subscriber',
    });
  }
};

export const blockSubscriberController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { remarks } = req.body;
    const subscriber = await blockSubscriber(req.params.id, remarks);
    const subscriberWithUrl = transformSubscriberWithUrls(subscriber);

    // Emit WebSocket event for subscriber status update
    emitSubscriberUpdate(req.params.id, {
      status: subscriberWithUrl.status || 'BLOCKED',
      updatedAt: new Date(),
    });

    res.status(200).json({
      status: 'success',
      data: subscriberWithUrl,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to block subscriber',
    });
  }
};

export const changePasswordController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    await changeSubscriberPassword(req.params.id, password);
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to change password',
    });
  }
};

export const getSubscriberTransactionsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const serviceId = req.query.serviceId as string | undefined;
    const transactions = await getSubscriberTransactions(req.params.id, serviceId);
    res.status(200).json({
      status: 'success',
      data: transactions,
    });
  } catch (error: any) {
    console.error('Error fetching subscriber transactions:', error);
    // Return 500 for server errors, 404 only for not found
    const statusCode = error.message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to fetch transactions',
    });
  }
};

export const searchCitizensController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.query as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query || query.trim().length < 2) {
      res.status(200).json({
        status: 'success',
        data: [],
      });
      return;
    }

    const citizens = await searchCitizensForLinking(query, limit);

    res.status(200).json({
      status: 'success',
      data: citizens,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to search citizens',
    });
  }
};
