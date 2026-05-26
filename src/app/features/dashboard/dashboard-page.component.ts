import { Component, inject, OnInit, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';
import { KpCardComponent } from '../../shared/ui';

interface StatItem {
  total: number;
  label: string;
  icon: string;
  group?: string;
  route?: string;
}

interface DashboardStats {
  products: StatItem;
  categories: StatItem;
  counterparties: StatItem;
  users: StatItem;
  roles: StatItem;
  statuses: StatItem;
  workTypes: StatItem;
  settings: StatItem;
  quotations: StatItem;
  orders: StatItem;
  boms: StatItem;
  operations: StatItem;
  techProcesses: StatItem;
  purchaseRequests: StatItem;
  purchaseOrders: StatItem;
  warehouses: StatItem;
  stockMovements: StatItem;
  reservations: StatItem;
  workOrders: StatItem;
  workOrderOperations: StatItem;
  costCalculations: StatItem;
  actualCosts: StatItem;
  shipments: StatItem;
  shippingDocs: StatItem;
  counters: StatItem;
  interactions: StatItem;
  total: number;
}

interface DepartmentStatGroup {
  id: string;
  label: string;
  icon: string;
  items: StatItem[];
}

const DEPT_GROUPS: { id: string; label: string; icon: string }[] = [
  { id: 'office', label: 'Офис', icon: 'pi pi-building' },
  { id: 'production', label: 'Производство', icon: 'pi pi-cog' },
  { id: 'warehouse', label: 'Склад', icon: 'pi pi-warehouse' },
  { id: 'accounting', label: 'Бухгалтерия', icon: 'pi pi-calculator' },
  { id: 'admin', label: 'Администрирование', icon: 'pi pi-shield' },
];

const STAT_ROUTES: Partial<Record<keyof DashboardStats, string>> = {
  products: '/products',
  categories: '/directories',
  counterparties: '/directories',
  users: '/directories',
  roles: '/directories',
  statuses: '/directories',
  workTypes: '/directories',
  settings: '/directories',
  quotations: '/quotations',
  orders: '/orders',
  boms: '/modules',
  operations: '/modules',
  techProcesses: '/modules',
  purchaseRequests: '/modules',
  purchaseOrders: '/purchase-orders',
  warehouses: '/modules',
  stockMovements: '/modules',
  reservations: '/modules',
  workOrders: '/work-orders',
  workOrderOperations: '/modules',
  costCalculations: '/modules',
  actualCosts: '/modules',
  shipments: '/shipments',
  shippingDocs: '/modules',
  counters: '/modules',
  interactions: '/modules',
};

const DEPT_STAT_KEYS: Record<string, (keyof DashboardStats)[]> = {
  office: ['products', 'counterparties', 'quotations', 'orders', 'interactions'],
  production: ['boms', 'operations', 'techProcesses', 'workOrders', 'workOrderOperations'],
  warehouse: ['purchaseRequests', 'purchaseOrders', 'warehouses', 'stockMovements', 'reservations', 'shipments'],
  accounting: ['costCalculations', 'actualCosts', 'shippingDocs'],
  admin: ['categories', 'users', 'roles', 'statuses', 'workTypes', 'settings', 'counters'],
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KpCardComponent, RouterLink],
  template: `
    <div class="page">
      <div class="page__header">
        <h1>Дашборд</h1>
        @if (!loading()) {
          <span class="page__subtitle">
            Всего записей: <strong>{{ stats()?.total }}</strong>
          </span>
        }
      </div>

      @if (!loading()) {
        <div class="dashboard">
          @for (group of deptStats(); track group.id) {
            @if (group.items.length > 0) {
              <h2 class="dashboard__section">
                <i [class]="group.icon + ' dashboard__section-icon'" aria-hidden="true"></i>
                {{ group.label }}
              </h2>
              <div class="dashboard__grid">
                @for (item of group.items; track item.label) {
                  <a
                    class="dashboard__card"
                    [routerLink]="item.route || '/dashboard'"
                  >
                    <app-kp-card>
                      <div class="dashboard__card-body">
                        <i [class]="item.icon + ' dashboard__card-icon'" aria-hidden="true"></i>
                        <div class="dashboard__card-info">
                          <span class="dashboard__card-value">{{ item.total }}</span>
                          <span class="dashboard__card-label">{{ item.label }}</span>
                        </div>
                      </div>
                    </app-kp-card>
                  </a>
                }
              </div>
            }
          }
        </div>
      } @else {
        <div class="dashboard dashboard--loading" role="status" aria-live="polite">
          @for (_ of skeletonSlots; track $index) {
            <div class="dashboard__skeleton">
              <div class="dashboard__skeleton-icon"></div>
              <div class="dashboard__skeleton-text"></div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);
  readonly deptStats = signal<DepartmentStatGroup[]>([]);
  readonly skeletonSlots = Array.from({ length: 12 });

  ngOnInit(): void {
    this.http
      .get<{ success: boolean; data: DashboardStats }>(`${environment.apiUrl}/dashboard/stats`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.stats.set(res.data);
          const groups: DepartmentStatGroup[] = DEPT_GROUPS.map((dept) => {
            const items: StatItem[] = [];
            for (const key of DEPT_STAT_KEYS[dept.id] || []) {
              const raw = res.data[key];
              if (raw && typeof raw === 'object' && 'label' in raw) {
                const item = raw as StatItem;
                items.push({ ...item, route: STAT_ROUTES[key] });
              }
            }
            return { id: dept.id, label: dept.label, icon: dept.icon, items };
          });
          this.deptStats.set(groups);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
