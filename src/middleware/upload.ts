import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { Request } from 'express';

// Ensure upload directories exist and have proper permissions
const uploadDirs = ['images', 'videos', 'documents', 'thumbnails', 'proofs'];

// Create main upload directory first
const mainUploadPath = config.upload.uploadPath;
if (!fs.existsSync(mainUploadPath)) {
  fs.mkdirSync(mainUploadPath, { recursive: true, mode: 0o755 });
  console.log(`✓ Created main upload directory: ${mainUploadPath}`);
}

// Create subdirectories
uploadDirs.forEach(dir => {
  const dirPath = path.join(mainUploadPath, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
    console.log(`✓ Created upload subdirectory: ${dirPath}`);
  }
});

// Determine upload directory based on file type
const getUploadDir = (mimetype: string): string => {
  if (config.upload.allowedImageTypes.includes(mimetype)) {
    return 'images';
  }
  if (config.upload.allowedVideoTypes.includes(mimetype)) {
    return 'videos';
  }
  if (config.upload.allowedDocTypes.includes(mimetype)) {
    return 'documents';
  }
  return 'others';
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req: Request, file, cb) => {
    const subDir = getUploadDir(file.mimetype);
    const uploadDir = path.join(config.upload.uploadPath, subDir);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req: Request, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  },
});

// File filter for images
const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.upload.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// File filter for videos
const videoFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.upload.allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MOV, AVI, WebM, and MPEG videos are allowed.'));
  }
};

// File filter for documents
const documentFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.upload.allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
  }
};

// Combined filter for all file types
const allFilesFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allAllowed = [
    ...config.upload.allowedImageTypes,
    ...config.upload.allowedVideoTypes,
    ...config.upload.allowedDocTypes,
  ];
  
  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
  }
};

// Upload middleware for images (profile pictures, thumbnails)
export const uploadImage = multer({
  storage,
  limits: {
    fileSize: config.upload.maxImageSize,
  },
  fileFilter: imageFilter,
});

// Upload middleware for videos (course content)
export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: config.upload.maxVideoSize,
  },
  fileFilter: videoFilter,
});

// Upload middleware for documents (verification proofs, assignments)
export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: documentFilter,
});

// General upload middleware (any file type)
export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: allFilesFilter,
});

// Helper function to delete a file
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(config.upload.uploadPath, filePath);
    fs.unlink(fullPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Helper function to get file URL
export const getFileUrl = (filePath: string): string => {
  return `${config.apiUrl}/uploads/${filePath}`;
};

// Helper to get relative path from full path
export const getRelativePath = (fullPath: string): string => {
  return fullPath.replace(config.upload.uploadPath + '/', '');
};
