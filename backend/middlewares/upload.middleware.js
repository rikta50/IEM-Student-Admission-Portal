/**
 * Multer Document Upload Middleware
 * Enforces file type validation (PDF, JPEG, PNG) and 5 MB size limit
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../config/constants');
const { errorResponse } = require('../utils/apiResponse');

const uploadDir = path.join(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const docType = req.params.docType || 'doc';
    const applicantId = req.user ? req.user.id : 'unknown';
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFilename = `${docType}_${applicantId}_${Date.now()}_${randomSuffix}${ext}`;
    cb(null, safeFilename);
  }
});

// MIME type filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file format. Only PDF, JPEG, and PNG files are accepted.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

/**
 * Higher-order middleware to wrap single file upload with standard error response
 */
const uploadSingle = (fieldName) => {
  const multerMiddleware = upload.single(fieldName);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return errorResponse(res, 400, 'File size exceeds the 5 MB maximum limit.');
          }
          return errorResponse(res, 400, `Upload error: ${err.message}`);
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return errorResponse(res, 400, err.message);
        }
        return errorResponse(res, 400, err.message || 'File upload failed.');
      }

      // Security check: Validate actual binary magic bytes
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          const buffer = Buffer.alloc(8);
          const fd = fs.openSync(req.file.path, 'r');
          fs.readSync(fd, buffer, 0, 8, 0);
          fs.closeSync(fd);

          const isPdf = buffer.slice(0, 4).toString() === '%PDF';
          const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
          const isPng =
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47;

          let validMagic = false;
          if (req.file.mimetype === 'application/pdf' && isPdf) validMagic = true;
          if (req.file.mimetype === 'image/jpeg' && isJpg) validMagic = true;
          if (req.file.mimetype === 'image/png' && isPng) validMagic = true;

          if (!validMagic) {
            fs.unlinkSync(req.file.path);
            return errorResponse(
              res,
              400,
              'Security verification failed: File content does not match its extension or MIME type.'
            );
          }
        } catch (readErr) {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return errorResponse(res, 400, 'Unable to verify file integrity.');
        }
      }

      return next();
    });
  };
};

module.exports = {
  upload,
  uploadSingle,
  uploadDir
};
