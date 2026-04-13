import multer from 'multer';
import { uploadToSupabase } from '../utils/supabaseStorage.js';

const createUploader = (folder, fields) => {
  const storage = multer.memoryStorage();
  const upload = multer({ storage });
  const multerMiddleware = upload.fields(fields);

  const supabaseMiddleware = async (req, res, next) => {
    try {
      if (!req.files) return next();

      for (const fieldName of Object.keys(req.files)) {
        for (const file of req.files[fieldName]) {
          const timestamp = Date.now();
          const sanitized = file.originalname.replace(/\s+/g, '_');
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
