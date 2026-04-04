import multer from 'multer';
import fs from 'fs';

const createUploader = (getUploadPathFn, fields) => {
  const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadPath = getUploadPathFn(req);
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
      const timestamp = Date.now();
      const sanitized = file.originalname.replace(/\s+/g, '_');
      cb(null, `${timestamp}-${sanitized}`);
    }
  });

  const upload = multer({ storage });

  return upload.fields(fields);
};

export default createUploader;

