import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface StatItem {
  total: number;
  label: string;
  icon: string;
  group?: string;
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

/** Какие ключи статистики к какому отделу относятся */
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
  imports: [CardModule, ButtonModule, RouterLink],
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
              <h3 class="dashboard__section">
                <i [class]="group.icon + ' dashboard__section-icon'"></i>
                {{ group.label }}
              </h3>
              <div class="dashboard__grid">
                @for (item of group.items; track item.label) {
                  <div
                    class="dashboard__card"
                    [routerLink]="group.id === 'admin' ? '/directories' : '/modules'"
                  >
                    <p-card>
                      <ng-template pTemplate="content">
                        <div class="dashboard__card-body">
                          <i [class]="item.icon + ' dashboard__card-icon'"></i>
                          <div class="dashboard__card-info">
                            <span class="dashboard__card-value">{{ item.total }}</span>
                            <span class="dashboard__card-label">{{ item.label }}</span>
                          </div>
                        </div>
                      </ng-template>
                    </p-card>
                  </div>
                }
              </div>
            }
          }
        </div>
      } @else {
        <div class="dashboard dashboard--loading">
          @for (_ of [].constructor(12); track $index) {
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
  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);
  /** Сгруппированные по отделам статистики */
  readonly deptStats = signal<DepartmentStatGroup[]>([]);

  ngOnInit(): void {
    this.http
      .get<{ success: boolean; data: DashboardStats }>(`${environment.apiUrl}/dashboard/stats`)
      .subscribe({
        next: (res) => {
          this.stats.set(res.data);
          const groups: DepartmentStatGroup[] = DEPT_GROUPS.map((dept) => ({
            id: dept.id,
            label: dept.label,
            icon: dept.icon,
            items: (DEPT_STAT_KEYS[dept.id] || [])
              .map((key) => res.data[key])
              .filter((item): item is StatItem => !!item),
          }));
          this.deptStats.set(groups);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
