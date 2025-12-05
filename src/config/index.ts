import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://edutech:edutech@localhost:5432/edutech?schema=public',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
  
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    secret: process.env.RAZORPAY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB default
    maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE || '524288000', 10), // 500MB for videos
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '10485760', 10), // 10MB for images
    uploadPath: process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'),
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg'],
    allowedDocTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  
  media: {
    thumbnailWidth: 320,
    thumbnailHeight: 180,
    videoQuality: 'medium', // low, medium, high
  },
  
  cloudflare: {
    tunnelEnabled: process.env.CLOUDFLARE_TUNNEL_ENABLED === 'true',
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@edutech.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  },
};
