import multer from 'multer';
import path from 'path';
import { uploadToSupabase } from '../utils/supabaseStorage.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_FIELDS = new Set([
  'barangayLogoPath',
  'certificateBackgroundPath',
  'organizationalChartPath',
  'municipalityLogoPath',
  'idBackgroundFrontPath',
  'idBackgroundBackPath',
  'picturePath',
]);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const safeName = (name) =>
  path.basename(name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');

const createUploader = (folder, fields, beforeUpload) => {
  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: fields.length },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_FIELDS.has(file.fieldname) && !IMAGE_TYPES.has(file.mimetype)) {
        return cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'));
      }
      cb(null, true);
    },
  });
  const multerMiddleware = upload.fields(fields);

  const supabaseMiddleware = async (req, res, next) => {
    try {
      if (!req.files) return next();
      if (beforeUpload) await beforeUpload(req);

      for (const fieldName of Object.keys(req.files)) {
        for (const file of req.files[fieldName]) {
          const timestamp = Date.now();
          const sanitized = safeName(file.originalname);
          const storagePath = `${folder}/${timestamp}-${sanitized}`;
          const publicUrl = await uploadToSupabase(
            file.buffer,
            storagePath,
            file.mimetype
          );
          file.path = publicUrl;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  return [multerMiddleware, supabaseMiddleware];
};

export default createUploader;
