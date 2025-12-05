import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import prisma from './config/database';

// Import routes
import authRoutes from './routes/authRoutes';
import courseRoutes from './routes/courseRoutes';
import enrollmentRoutes from './routes/enrollmentRoutes';
import teacherRoutes from './routes/teacherRoutes';
import studentRoutes from './routes/studentRoutes';
import reviewRoutes from './routes/reviewRoutes';
import paymentRoutes from './routes/paymentRoutes';
import mediaRoutes from './routes/mediaRoutes';
import contactRoutes from './routes/contactRoutes';

const app: Application = express();

// Trust proxy for Cloudflare Tunnel and nginx
app.set('trust proxy', true);

// Security: Disable X-Powered-By header
app.disable('x-powered-by');

// Request size limits - increased for video uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS configuration for Vercel frontend and Cloudflare
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, Cloudflare)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.cors.origin.split(',').map(o => o.trim());
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'CF-Connecting-IP', 'CF-Ray'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(cookieParser());

// Static files for uploads with proper headers for video streaming
app.use('/uploads', express.static(config.upload.uploadPath, {
  maxAge: config.nodeEnv === 'production' ? '7d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set proper headers for video streaming
    if (filePath.endsWith('.mp4') || filePath.endsWith('.webm') || filePath.endsWith('.mov')) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'video/mp4');
    }
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// Health check endpoint for load balancers and Cloudflare
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/contact', contactRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Close database connection
  await prisma.$disconnect();
  
  console.log('Graceful shutdown completed');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection before starting
    await prisma.$connect();
    console.log('✓ Database connected');
    
    const server = app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║         EduTech Backend Server Started                ║
╠═══════════════════════════════════════════════════════╣
║   Port: ${config.port}                                      ║
║   Environment: ${config.nodeEnv.padEnd(36)}║
║   Memory Limit: ${process.env.NODE_OPTIONS || 'default'}
║   Time: ${new Date().toISOString()}
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // Set server timeout
    server.timeout = 30000; // 30 seconds
    server.keepAliveTimeout = 65000; // Slightly higher than nginx
    server.headersTimeout = 66000;
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
