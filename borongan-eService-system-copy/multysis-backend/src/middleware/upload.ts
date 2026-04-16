import multer from 'multer';
import path from 'path';
import { uploadToSupabase } from '../utils/supabaseStorage';

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_')
    .substring(0, 255);
};

// Validate file content using magic bytes (accepts Buffer directly)
const validateFileContent = async (buffer: Buffer, allowedMimes: string[]): Promise<boolean> => {
  try {
    const { fileTypeFromBuffer } = await import('file-type');
    const fileType = await fileTypeFromBuffer(buffer);

    if (!fileType) {
      return false;
    }

    return allowedMimes.includes(fileType.mime);
  } catch (error) {
    return false;
  }
};

// File filter for images
const imageFilter = async (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    return;
  }

  cb(null, true);
};

// File filter for documents
const documentFilter = async (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG, and PNG files are allowed.'));
    return;
  }

  cb(null, true);
};

const memStorage = multer.memoryStorage();

// Multer instances
export const uploadProfilePicture = multer({
  storage: memStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

export const uploadDocument = multer({
  storage: memStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: documentFilter,
});

// Multer for citizen images (citizenPicture, proofOfResidency, proofOfIdentification)
export const uploadCitizenFiles = multer({
  storage: memStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'citizenPicture') {
      imageFilter(req, file, cb);
    } else {
      documentFilter(req, file, cb);
    }
  },
});

// Multer for program application file uploads (any field name = requirement label)
export const uploadProgramApplicationFiles = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: documentFilter,
}).any();

/**
 * Upload a single Multer file to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadFileToSupabase(
  file: Express.Multer.File,
  folder: string,
  prefix: string
): Promise<string> {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const sanitizedName = sanitizeFilename(file.originalname);
  const ext = path.extname(sanitizedName) || path.extname(file.originalname);
  const storagePath = `${folder}/${prefix}-${uniqueSuffix}${ext}`;

  return uploadToSupabase(file.buffer, storagePath, file.mimetype);
}

export const getFileUrl = (filePath: string): string => {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  if (filePath.includes('supabase') || filePath.includes('storage')) {
    return filePath;
  }
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const bucket = process.env.ESERVICE_BUCKET || 'eservice-uploads';
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
};

export { sanitizeFilename, validateFileContent };
