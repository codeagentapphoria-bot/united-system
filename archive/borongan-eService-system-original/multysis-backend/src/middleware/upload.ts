import fs from 'fs';
import multer from 'multer';
import path from 'path';

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, imagesDir, documentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedOriginalName) || path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

// Configure storage for documents
const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedOriginalName) || path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename: string): string => {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_')
    .substring(0, 255); // Limit length
};

// Validate file content using magic bytes
const validateFileContent = async (filePath: string, allowedMimes: string[]): Promise<boolean> => {
  try {
    const buffer = fs.readFileSync(filePath);
    // Use dynamic import for ESM-only file-type package
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

  // First check MIME type (quick check)
  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    return;
  }

  // Note: Content validation will happen after file is saved in the route handler
  // This is because multer needs the file to be saved first to read its content
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

  // First check MIME type (quick check)
  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG, and PNG files are allowed.'));
    return;
  }

  // Note: Content validation will happen after file is saved in the route handler
  // This is because multer needs the file to be saved first to read its content
  cb(null, true);
};

// Multer instances
export const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

export const uploadDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: documentFilter,
});

// Multer for citizen images (citizenPicture, proofOfResidency, proofOfIdentification)
export const uploadCitizenFiles = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      // Determine destination based on field name
      if (_file.fieldname === 'citizenPicture') {
        cb(null, imagesDir);
      } else {
        cb(null, documentsDir);
      }
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const sanitizedOriginalName = sanitizeFilename(file.originalname);
      const ext = path.extname(sanitizedOriginalName) || path.extname(file.originalname);
      // Use specific prefixes for each file type to ensure uniqueness and clarity
      let prefix: string;
      switch (file.fieldname) {
        case 'citizenPicture':
          prefix = 'citizen';
          break;
        case 'proofOfResidency':
          prefix = 'proof-residency';
          break;
        case 'proofOfIdentification':
          prefix = 'proof-id';
          break;
        default:
          prefix = 'doc'; // Fallback for any other field names
      }
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Use image filter for citizenPicture, document filter for others
    if (file.fieldname === 'citizenPicture') {
      imageFilter(req, file, cb);
    } else {
      documentFilter(req, file, cb);
    }
  },
});

// Helper to get file path (relative path stored in DB)
export const getFilePath = (filename: string, type: 'image' | 'document'): string => {
  const path = type === 'image' ? '/uploads/images' : '/uploads/documents';
  return `${path}/${filename}`;
};

// Helper to get full file URL (for API responses - prepends base URL)
export const getFileUrl = (filePath: string): string => {
  // If already a full URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  // Ensure filePath starts with /
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${baseUrl}${normalizedPath}`;
};

// Export validation function for use in route handlers
export { sanitizeFilename, validateFileContent };
