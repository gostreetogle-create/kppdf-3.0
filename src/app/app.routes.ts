import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login-page.component').then(c => c.LoginPageComponent),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(c => c.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard-page.component').then(c => c.DashboardPageComponent),
      },
      {
        path: 'directories',
        loadComponent: () => import('./features/directories/directories-page.component').then(c => c.DirectoriesPageComponent),
      },
      {
        path: 'modules',
        loadComponent: () => import('./features/modules/modules-page.component').then(c => c.ModulesPageComponent),
      },
      {
        path: 'documents',
        loadComponent: () => import('./features/documents/documents-page.component').then(c => c.DocumentsPageComponent),
      },
    ],
  },
  {
    path: '404',
    loadComponent: () => import('./features/not-found/not-found-page.component').then(c => c.NotFoundPageComponent),
  },
  { path: '**', redirectTo: '/404' },
];
