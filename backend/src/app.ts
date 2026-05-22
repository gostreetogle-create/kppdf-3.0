import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/error-handler';
import { healthRouter } from './modules/health/health.router';
import { productRouter } from './modules/products/product.router';
import { categoryRouter } from './modules/categories/category.router';
import { counterpartyRouter } from './modules/counterparties/counterparty.router';
import { userRouter } from './modules/users/user.router';
import { roleRouter } from './modules/roles/role.router';
import { statusRouter } from './modules/statuses/status.router';
import { workTypeRouter } from './modules/work-types/work-type.router';
import { settingRouter } from './modules/settings/setting.router';
import { authRouter } from './modules/auth/auth.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';

const app = express();

// Request logging (dev)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`  ${req.method} ${req.path}`);
    next();
  });
}

// CORS — разрешаем frontend (localhost:4200 в dev, /api проксируется)
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/directories/products', productRouter);
app.use('/api/v1/directories/categories', categoryRouter);
app.use('/api/v1/directories/counterparties', counterpartyRouter);
app.use('/api/v1/directories/users', userRouter);
app.use('/api/v1/directories/roles', roleRouter);
app.use('/api/v1/directories/statuses', statusRouter);
app.use('/api/v1/directories/work-types', workTypeRouter);
app.use('/api/v1/directories/settings', settingRouter);

// Auth
app.use('/api/v1/auth', authRouter);

// Dashboard
app.use('/api/v1/dashboard', dashboardRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
