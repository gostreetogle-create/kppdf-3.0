import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService, type ApiResponse } from './api.service';
import type { ProjectReadinessSnapshot } from './project-readiness.model';

export interface DashboardStatItem {
  total: number;
  label: string;
  icon: string;
  group?: string;
  route?: string;
}

export interface DashboardStats {
  products: DashboardStatItem;
  categories: DashboardStatItem;
  counterparties: DashboardStatItem;
  users: DashboardStatItem;
  roles: DashboardStatItem;
  statuses: DashboardStatItem;
  workTypes: DashboardStatItem;
  settings: DashboardStatItem;
  quotations: DashboardStatItem;
  orders: DashboardStatItem;
  boms: DashboardStatItem;
  operations: DashboardStatItem;
  techProcesses: DashboardStatItem;
  purchaseRequests: DashboardStatItem;
  purchaseOrders: DashboardStatItem;
  warehouses: DashboardStatItem;
  stockMovements: DashboardStatItem;
  reservations: DashboardStatItem;
  workOrders: DashboardStatItem;
  workOrderOperations: DashboardStatItem;
  costCalculations: DashboardStatItem;
  actualCosts: DashboardStatItem;
  shipments: DashboardStatItem;
  shippingDocs: DashboardStatItem;
  counters: DashboardStatItem;
  interactions: DashboardStatItem;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  getStats(): Observable<ApiResponse<DashboardStats>> {
    return this.api.get<DashboardStats>('/dashboard/stats');
  }

  /** Статический JSON из public/ — без ApiService (не добавлять baseUrl). */
  getReadiness(): Observable<ProjectReadinessSnapshot | null> {
    return this.http.get<ProjectReadinessSnapshot>('/project-readiness.json').pipe(
      map((data) => (data.enabled ? data : null)),
      catchError(() => of(null)),
    );
  }
}
