import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { initDb } from './db/index.js';
import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import productRoutes from './modules/product/product.routes.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/customers', customerRoutes);
app.use('/customers', customerRoutes);

app.use('/api/products', productRoutes);
app.use('/products', productRoutes);
app.use('/api/inventory', productRoutes);
app.use('/inventory', productRoutes);
app.use('/api/stock-movements', productRoutes);
app.use('/stock-movements', productRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Server Error]', err.stack || err.message || err);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});

export const startServer = async (): Promise<void> => {
  try {
    await initDb();
    app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🚀 Mini-ERP Backend (TypeScript) running on http://localhost:${config.port}`);
      console.log(`🔐 Auth API base URL: http://localhost:${config.port}/api/auth`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test' && process.argv[1]?.includes('server')) {
  startServer();
}

export default app;
