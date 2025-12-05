import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { uploadImage, uploadVideo, uploadDocument, upload, deleteFile, getFileUrl, getRelativePath } from '../middleware/upload';
import { sendSuccess, sendError } from '../utils/response';
import { config } from '../config';

const router = Router();

// Generic upload endpoint (routes based on type query parameter)
// Usage: POST /media/upload?type=thumbnail|video|document
router.post('/upload', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const type = (req.query.type as string) || '';

    if (!type) {
      if (req.file) {
        try { await deleteFile(getRelativePath(req.file.path)); } catch (_) {}
      }
      return sendError(res, 'Type query parameter is required (thumbnail, video, or document)', 400);
    }

    if (!req.file) {
      return sendError(res, 'No file provided', 400);
    }

    const file = req.file as Express.Multer.File;
    let isValid = false;

    // Validate based on type
    switch (type) {
      case 'thumbnail':
        isValid = config.upload.allowedImageTypes.includes(file.mimetype) && file.size <= config.upload.maxImageSize;
        break;
      case 'video':
        isValid = config.upload.allowedVideoTypes.includes(file.mimetype) && file.size <= config.upload.maxVideoSize;
        break;
      case 'document':
        isValid = config.upload.allowedDocTypes.includes(file.mimetype) && file.size <= config.upload.maxFileSize;
        break;
      default:
        isValid = false;
    }

    if (!isValid) {
      try { await deleteFile(getRelativePath(file.path)); } catch (e) { console.error('Failed to delete invalid upload', e); }
      return sendError(res, `File does not match type "${type}" or exceeds size limit`, 400);
    }

    const relativePath = getRelativePath(file.path);

    sendSuccess(res, {
      filename: file.filename,
      originalName: file.originalname,
      path: relativePath,
      url: `${config.apiUrl}/uploads/${relativePath}`,
      size: file.size,
      mimetype: file.mimetype,
      type: type,
    }, 'File uploaded successfully', 201);
  } catch (error) {
    console.error('Generic upload error:', error);
    if (req.file) {
      try { await deleteFile(getRelativePath(req.file.path)); } catch (_) {}
    }
    sendError(res, 'Failed to upload file', 500);
  }
});

// Upload single image (profile, thumbnail)
router.post('/image', authenticate, uploadImage.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    const relativePath = getRelativePath(req.file.path);
    const fileUrl = getFileUrl(relativePath);

    sendSuccess(res, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: relativePath,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 'Image uploaded successfully', 201);
  } catch (error) {
    console.error('Image upload error:', error);
    sendError(res, 'Failed to upload image', 500);
  }
});

// Upload video (course content)
router.post('/video', authenticate, uploadVideo.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'No video file provided', 400);
    }

    const relativePath = getRelativePath(req.file.path);
    const fileUrl = getFileUrl(relativePath);

    sendSuccess(res, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: relativePath,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      // Duration will be added later with ffprobe if needed
    }, 'Video uploaded successfully', 201);
  } catch (error) {
    console.error('Video upload error:', error);
    sendError(res, 'Failed to upload video', 500);
  }
});

// Upload document (proofs, assignments)
router.post('/document', authenticate, uploadDocument.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'No document file provided', 400);
    }

    const relativePath = getRelativePath(req.file.path);
    const fileUrl = getFileUrl(relativePath);

    sendSuccess(res, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: relativePath,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 'Document uploaded successfully', 201);
  } catch (error) {
    console.error('Document upload error:', error);
    sendError(res, 'Failed to upload document', 500);
  }
});

// Upload multiple files
router.post('/multiple', authenticate, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return sendError(res, 'No files provided', 400);
    }

    const uploadedFiles = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: getRelativePath(file.path),
      url: getFileUrl(getRelativePath(file.path)),
      size: file.size,
      mimetype: file.mimetype,
    }));

    sendSuccess(res, { files: uploadedFiles }, `${files.length} files uploaded successfully`, 201);
  } catch (error) {
    console.error('Multiple upload error:', error);
    sendError(res, 'Failed to upload files', 500);
  }
});

// Delete file
router.delete('/:type/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, filename } = req.params;
    const allowedTypes = ['images', 'videos', 'documents', 'thumbnails', 'proofs'];
    
    if (!allowedTypes.includes(type)) {
      return sendError(res, 'Invalid file type', 400);
    }

    const filePath = `${type}/${filename}`;
    await deleteFile(filePath);

    sendSuccess(res, null, 'File deleted successfully');
  } catch (error) {
    console.error('Delete file error:', error);
    sendError(res, 'Failed to delete file', 500);
  }
});

// Stream video with range support (for video playback)
router.get('/stream/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const videoPath = path.join(config.upload.uploadPath, 'videos', filename);

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return sendError(res, 'Video not found', 404);
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // No range header, send full file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Video stream error:', error);
    sendError(res, 'Failed to stream video', 500);
  }
});

// Get file info
router.get('/info/:type/:filename', async (req: Request, res: Response) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(config.upload.uploadPath, type, filename);

    if (!fs.existsSync(filePath)) {
      return sendError(res, 'File not found', 404);
    }

    const stat = fs.statSync(filePath);
    
    sendSuccess(res, {
      filename,
      type,
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
      url: getFileUrl(`${type}/${filename}`),
    }, 'File info retrieved');
  } catch (error) {
    console.error('Get file info error:', error);
    sendError(res, 'Failed to get file info', 500);
  }
});

export default router;
