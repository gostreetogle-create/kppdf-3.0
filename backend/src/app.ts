import path from 'path';
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
import { quotationRouter } from './modules/quotations/quotation.router';
import { orderRouter } from './modules/orders/order.router';
import { bomRouter } from './modules/boms/bom.router';
import { operationRouter } from './modules/operations/operation.router';
import { techProcessRouter } from './modules/tech-processes/techProcess.router';
import { purchaseRequestRouter } from './modules/purchase-requests/purchaseRequest.router';
import { purchaseOrderRouter } from './modules/purchase-orders/purchaseOrder.router';
import { warehouseRouter } from './modules/warehouses/warehouse.router';
import { counterRouter } from './modules/counters/counter.router';
import { stockMovementRouter } from './modules/stock/stockMovement.router';
import { reservationRouter } from './modules/reservations/reservation.router';
import { workOrderRouter } from './modules/work-orders/workOrder.router';
import { workOrderOperationRouter } from './modules/work-order-operations/workOrderOperation.router';
import { costCalculationRouter } from './modules/cost/costCalculation.router';
import { actualCostRouter } from './modules/actual-costs/actualCost.router';
import { shipmentRouter } from './modules/shipments/shipment.router';
import { shippingDocRouter } from './modules/shipping-docs/shippingDoc.router';
import { interactionRouter } from './modules/interactions/interaction.router';
import { documentTemplateRouter } from './modules/document-templates/documentTemplate.router';
import { tenderRouter } from './modules/tenders/tender.router';
import { productPassportRouter } from './modules/product-passports/productPassport.router';
import { complianceRuleRouter, complianceCheckRouter } from './modules/compliance-validator/complianceRule.router';
import { attributeDefinitionRouter } from './modules/attribute-definitions/attributeDefinition.router';
import { entityAttributeValueRouter } from './modules/entity-attribute-values/entityAttributeValue.router';
import { readinessRouter } from './modules/readiness/readiness.router';

const app = express();

// Request logging (dev)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`  ${req.method} ${req.path}`);
    next();
  });
}

// CORS — разрешаем frontend
const corsOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || 'https://sport-set.ru').split(',')
  : ['http://localhost:4200', 'http://localhost:4000'];

app.use(cors({
  origin: corsOrigins,
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

// Readiness feedback (file-based backlog for AI)
app.use('/api/v1/readiness', readinessRouter);

// New modules (Quotations → Shipments)
app.use('/api/v1/directories/quotations', quotationRouter);
app.use('/api/v1/directories/orders', orderRouter);
app.use('/api/v1/directories/boms', bomRouter);
app.use('/api/v1/directories/operations', operationRouter);
app.use('/api/v1/directories/tech-processes', techProcessRouter);
app.use('/api/v1/directories/purchase-requests', purchaseRequestRouter);
app.use('/api/v1/directories/purchase-orders', purchaseOrderRouter);
app.use('/api/v1/directories/warehouses', warehouseRouter);
app.use('/api/v1/counters', counterRouter);
app.use('/api/v1/stock/movements', stockMovementRouter);
app.use('/api/v1/stock/reservations', reservationRouter);
app.use('/api/v1/directories/work-orders', workOrderRouter);
app.use('/api/v1/directories/work-order-operations', workOrderOperationRouter);
app.use('/api/v1/cost', costCalculationRouter);
app.use('/api/v1/directories/actual-costs', actualCostRouter);
app.use('/api/v1/directories/shipments', shipmentRouter);
app.use('/api/v1/directories/shipping-docs', shippingDocRouter);
app.use('/api/v1/directories/interactions', interactionRouter);

// Tenders (входящие запросы)
app.use('/api/v1/directories/tenders', tenderRouter);

// Product Passports (паспорта изделий)
app.use('/api/v1/directories/product-passports', productPassportRouter);

// Compliance Validator
app.use('/api/v1/compliance/rules', complianceRuleRouter);
app.use('/api/v1/compliance', complianceCheckRouter);

// Document Templates
app.use('/api/v1/document-templates', documentTemplateRouter);

// EAV — Entity-Attribute-Value
app.use('/api/v1/attributes/definitions', attributeDefinitionRouter);
app.use('/api/v1/attributes/values', entityAttributeValueRouter);

// In production, serve the Angular frontend (before notFound!)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '..', '..', 'dist', 'kppdf-3.0');
  app.use(express.static(frontendPath));

  // All non-API routes → Angular index.html (SPA)
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
  console.log(`📁 Serving frontend from: ${frontendPath}`);
}

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
