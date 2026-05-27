import { Component, inject, OnInit, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KpStatGridComponent, type KpStatSection } from '../../shared/ui';
import { DashboardService, type DashboardStats, type DashboardStatItem } from '../../core/dashboard.service';

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
  imports: [KpStatGridComponent],
  template: `
    <div class="page">
      <div class="page__header">
        <h1>Дашборд</h1>
        @if (!loading()) {
          <span class="page__subtitle">
            Всего записей: <strong>{{ totalRecords() }}</strong>
          </span>
        }
      </div>

      <app-kp-stat-grid [sections]="sections()" [loading]="loading()" />
    </div>
  `,
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly totalRecords = signal(0);
  readonly sections = signal<KpStatSection[]>([]);

  ngOnInit(): void {
    this.dashboard
      .getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.totalRecords.set(res.data.total);
          const groups: KpStatSection[] = DEPT_GROUPS.map((dept) => {
            const items = (DEPT_STAT_KEYS[dept.id] || [])
              .map((key) => {
                const raw = res.data[key];
                if (!raw || typeof raw !== 'object' || !('label' in raw)) return null;
                const stat = raw as DashboardStatItem;
                return {
                  label: stat.label,
                  icon: stat.icon,
                  value: stat.total,
                  route: STAT_ROUTES[key],
                };
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);
            return { id: dept.id, label: dept.label, icon: dept.icon, items };
          });
          this.sections.set(groups);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
