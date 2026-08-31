import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth';
import ridersRoutes from './routes/riders';
import shipmentsRoutes from './routes/shipments';
import notificationsRoutes from './routes/notifications';
import alertsRoutes from './routes/alerts';
import contactRoutes from './routes/contact';
import uploadsRoutes from './routes/uploads';
import { initWebSocketServer } from './lib/ws';
import deductionsRoutes from './routes/deductions';

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Logs every request that actually reaches this process — placed before CORS
// so even rejected/blocked requests show up, not just successful ones.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms — origin: ${req.headers.origin ?? 'none'} ip: ${req.ip}`);
  });
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'CPS API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/riders', ridersRoutes);
app.use('/api/deductions', deductionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/uploads', uploadsRoutes);

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

initWebSocketServer(server);
