import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === 'application/pdf' && ext === '.pdf') {
    cb(null, true);
  } else {
    const error: any = new Error('Only PDF files are allowed (.pdf)');
    error.statusCode = 400;
    cb(error);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

/**
 * Middleware wrapper for single resume file upload.
 * Formats multer errors into standard { error: { message } } with proper status codes.
 */
export const uploadResume = (req: Request, res: Response, next: NextFunction) => {
  const singleUpload = upload.single('resume');

  singleUpload(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: { message: 'File size exceeds maximum limit of 5MB' },
          });
        }
        return res.status(400).json({
          error: { message: `Upload error: ${err.message}` },
        });
      }
      return res.status(err.statusCode || 400).json({
        error: { message: err.message || 'Invalid file upload' },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { message: 'No file uploaded. Please provide a file with field name "resume"' },
      });
    }

    next();
  });
};
