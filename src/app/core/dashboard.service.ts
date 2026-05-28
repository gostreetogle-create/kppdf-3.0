import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, type ApiResponse } from './api.service';

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

  getStats(): Observable<ApiResponse<DashboardStats>> {
    return this.api.get<DashboardStats>('/dashboard/stats');
  }
}
