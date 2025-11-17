import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import familyRoutes from './routes/family.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'family',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/family', familyRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'Endpoint no encontrado',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Family service listening on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
