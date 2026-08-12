import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { initDb } from './db/index.js';
import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import productRoutes from './modules/product/product.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import stockMovementRoutes from './modules/inventory/stockMovement.routes.js';
import challanRoutes from './modules/challan/challan.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import userRoutes from './modules/user/user.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
  'https://mini-erp-xi-seven.vercel.app',
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🚀 Mini-ERP Backend Server is running successfully!',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/customers', customerRoutes);
app.use('/customers', customerRoutes);

app.use('/api/products', productRoutes);
app.use('/products', productRoutes);

app.use('/api/inventory', inventoryRoutes);
app.use('/inventory', inventoryRoutes);

app.use('/api/stock-movements', stockMovementRoutes);
app.use('/stock-movements', stockMovementRoutes);

app.use('/api/challans', challanRoutes);
app.use('/challans', challanRoutes);

app.use('/api/audit-log', auditRoutes);
app.use('/audit-log', auditRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/dashboard', dashboardRoutes);

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
