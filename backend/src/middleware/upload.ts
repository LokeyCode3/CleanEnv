import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_SIZE, files: 6 },
});

// Validate file sizes after multer buffers them
export const validateFileSizes = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.files) return next();
  const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  for (const file of files) {
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
    const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > limit) {
      res.status(400).json({
        success: false,
        message: `File "${file.originalname}" exceeds size limit`,
      });
      return;
    }
  }
  next();
};
