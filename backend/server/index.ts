import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth';
import ridersRoutes from './routes/riders';
import shipmentsRoutes from './routes/shipments';
import notificationsRoutes from './routes/notifications';
import contactRoutes from './routes/contact';
import uploadsRoutes from './routes/uploads';

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

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
app.use('/api/notifications', notificationsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/uploads', uploadsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
