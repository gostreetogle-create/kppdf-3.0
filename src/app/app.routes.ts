import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login').then(c => c.LoginPageComponent),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(c => c.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard').then(c => c.DashboardPageComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products').then(c => c.ProductsPageComponent),
      },
      {
        path: 'directories',
        loadComponent: () => import('./features/directories').then(c => c.DirectoriesPageComponent),
      },
      {
        path: 'modules',
        loadComponent: () => import('./features/modules').then(c => c.ModulesPageComponent),
      },
      {
        path: 'tenders',
        loadComponent: () => import('./features/tenders').then(c => c.TendersPageComponent),
      },
      {
        path: 'quotations',
        loadComponent: () => import('./features/quotations').then(c => c.QuotationsPageComponent),
      },
      {
        path: 'quotations/:id',
        loadComponent: () => import('./features/quotations').then(c => c.QuotationEditorComponent),
      },
      {
        path: 'documents/:id',
        redirectTo: 'quotations/:id',
        pathMatch: 'full',
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders').then(c => c.OrdersPageComponent),
      },
      {
        path: 'product-passports',
        loadComponent: () => import('./features/product-passports').then(c => c.ProductPassportsPageComponent),
      },
      {
        path: 'work-orders',
        loadComponent: () => import('./features/work-orders').then(c => c.WorkOrdersPageComponent),
      },
      {
        path: 'purchase-orders',
        loadComponent: () => import('./features/purchase-orders').then(c => c.PurchaseOrdersPageComponent),
      },
      {
        path: 'shipments',
        loadComponent: () => import('./features/shipments').then(c => c.ShipmentsPageComponent),
      },
      {
        path: 'documents',
        loadComponent: () => import('./features/documents').then(c => c.DocumentsPageComponent),
      },
      {
        path: 'attribute-definitions',
        loadComponent: () => import('./features/attribute-definitions').then(c => c.AttributeDefinitionsPageComponent),
      },
      {
        path: 'document-table-types',
        loadComponent: () => import('./features/document-table-types').then(c => c.DocumentTableTypesPageComponent),
      },
      {
        path: 'document-templates',
        loadComponent: () => import('./features/document-templates').then(c => c.DocumentTemplatesPageComponent),
      },
      {
        path: 'document-templates/:id',
        loadComponent: () => import('./features/document-templates').then(c => c.DocumentTemplateEditorComponent),
      },
    ],
  },
  {
    path: '404',
    loadComponent: () => import('./features/not-found').then(c => c.NotFoundPageComponent),
  },
  { path: '**', redirectTo: '/404' },
];
