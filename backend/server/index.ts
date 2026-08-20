import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes will be imported here
// import authRoutes from './routes/auth';
// app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CPS API is running' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
