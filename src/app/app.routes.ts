import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login-page.component').then(c => c.LoginPageComponent),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/admin-layout/admin-layout.component').then(c => c.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard-page.component').then(c => c.DashboardPageComponent),
      },
      {
        path: 'directories',
        loadComponent: () => import('./pages/directories/directories-page.component').then(c => c.DirectoriesPageComponent),
      },
      {
        path: 'modules',
        loadComponent: () => import('./pages/modules/modules-page.component').then(c => c.ModulesPageComponent),
      },
      {
        path: 'documents',
        loadComponent: () => import('./pages/documents/documents-page.component').then(c => c.DocumentsPageComponent),
      },
      {
        path: 'documents/:id',
        loadComponent: () => import('./pages/documents/document-editor.component').then(c => c.DocumentEditorComponent),
      },
    ],
  },
  {
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found-page.component').then(c => c.NotFoundPageComponent),
  },
  { path: '**', redirectTo: '/404' },
];
