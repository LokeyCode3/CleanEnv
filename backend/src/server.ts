import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cron from 'node-cron';

import { connectDatabase } from './config/database';
import { configureCloudinary } from './config/cloudinary';
import { errorHandler, notFound } from './middleware/errorHandler';
import { checkSlaBreaches } from './services/sla.service';

import authRoutes from './routes/auth.routes';
import reportRoutes from './routes/report.routes';
import adminRoutes from './routes/admin.routes';
import officerRoutes from './routes/officer.routes';
import departmentRoutes from './routes/department.routes';
import categoryRoutes from './routes/category.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts' },
});

app.use(limiter);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Public Stats ─────────────────────────────────────────────────────────────
app.get('/api/public/stats', async (_req, res) => {
  try {
    const Report = (await import('./models/Report')).Report;
    const { ReportStatus } = await import('./types');
    const [total, resolved, active] = await Promise.all([
      Report.countDocuments({}),
      Report.countDocuments({ status: { $in: [ReportStatus.RESOLVED, ReportStatus.CLOSED] } }),
      Report.countDocuments({ status: { $nin: [ReportStatus.RESOLVED, ReportStatus.CLOSED, ReportStatus.REJECTED, ReportStatus.DUPLICATE] } }),
    ]);
    res.json({ success: true, data: { total, resolved, active } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Cron Jobs ────────────────────────────────────────────────────────────────
// Check SLA breaches every hour
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Running SLA breach check...');
  await checkSlaBreaches();
});

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  configureCloudinary();
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 PathHoles API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
};

start();

export default app;
