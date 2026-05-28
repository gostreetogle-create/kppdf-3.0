import { Component, inject, OnInit, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import {
  KpStatGridComponent,
  KpToastComponent,
  KpButtonComponent,
  EmptyStateComponent,
  PageLayoutComponent,
  type KpStatSection,
  type KpStatItem,
} from '../../shared/ui';
import { DashboardService, type DashboardStats, type DashboardStatItem } from '../../core/dashboard.service';

const DEPT_GROUPS: { id: string; label: string; icon: string }[] = [
  { id: 'admin', label: 'Администрирование', icon: 'pi pi-shield' },
  { id: 'office', label: 'Офис', icon: 'pi pi-building' },
  { id: 'warehouse', label: 'Склад', icon: 'pi pi-warehouse' },
  { id: 'production', label: 'Производство', icon: 'pi pi-cog' },
  { id: 'accounting', label: 'Бухгалтерия', icon: 'pi pi-calculator' },
];

interface StatRoute {
  path: string;
  queryParams?: Record<string, string>;
}

const STAT_ROUTES: Partial<Record<keyof DashboardStats, StatRoute>> = {
  products: { path: '/products' },
  categories: { path: '/directories', queryParams: { dir: 'categories' } },
  counterparties: { path: '/directories', queryParams: { dir: 'counterparties' } },
  users: { path: '/directories', queryParams: { dir: 'users' } },
  roles: { path: '/directories', queryParams: { dir: 'roles' } },
  statuses: { path: '/directories', queryParams: { dir: 'statuses' } },
  workTypes: { path: '/directories', queryParams: { dir: 'workTypes' } },
  settings: { path: '/directories', queryParams: { dir: 'settings' } },
  quotations: { path: '/quotations' },
  orders: { path: '/orders' },
  boms: { path: '/modules', queryParams: { module: 'boms' } },
  operations: { path: '/modules', queryParams: { module: 'operations' } },
  techProcesses: { path: '/modules', queryParams: { module: 'tech-processes' } },
  purchaseRequests: { path: '/modules', queryParams: { module: 'purchase-requests' } },
  purchaseOrders: { path: '/purchase-orders' },
  warehouses: { path: '/modules', queryParams: { module: 'warehouses' } },
  stockMovements: { path: '/modules', queryParams: { module: 'stock-movements' } },
  reservations: { path: '/modules', queryParams: { module: 'reservations' } },
  workOrders: { path: '/work-orders' },
  workOrderOperations: { path: '/modules', queryParams: { module: 'work-order-operations' } },
  costCalculations: { path: '/modules', queryParams: { module: 'cost-calculations' } },
  actualCosts: { path: '/modules', queryParams: { module: 'actual-costs' } },
  shipments: { path: '/shipments' },
  shippingDocs: { path: '/modules', queryParams: { module: 'shipping-docs' } },
  counters: { path: '/modules', queryParams: { module: 'counters' } },
  interactions: { path: '/modules', queryParams: { module: 'interactions' } },
};

const DEPT_STAT_KEYS: Record<string, (keyof DashboardStats)[]> = {
  admin: ['categories', 'statuses', 'roles', 'users', 'workTypes', 'counters', 'settings'],
  office: ['counterparties', 'products', 'quotations', 'orders', 'interactions'],
  warehouse: ['warehouses', 'purchaseRequests', 'purchaseOrders', 'stockMovements', 'reservations', 'shipments'],
  production: ['operations', 'techProcesses', 'boms', 'workOrders', 'workOrderOperations'],
  accounting: ['costCalculations', 'actualCosts', 'shippingDocs'],
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpStatGridComponent,
    KpToastComponent,
    KpButtonComponent,
    EmptyStateComponent,
    PageLayoutComponent,
  ],
  template: `
    <app-page-layout>
      <div page-header class="page__header">
        <div class="page__header-main">
          <h1>Дашборд</h1>
          @if (!loading() && !loadError()) {
            <span class="page__subtitle">
              Всего записей: <strong>{{ totalRecords() }}</strong>
            </span>
          }
        </div>
      </div>

      @if (loadError()) {
        <app-empty-state
          title="Не удалось загрузить данные"
          description="Проверьте подключение к серверу и попробуйте снова."
          icon="pi-exclamation-triangle"
        >
          <div empty-actions>
            <app-kp-button
              label="Повторить"
              icon="pi pi-refresh"
              size="small"
              (buttonClick)="loadStats()"
            />
          </div>
        </app-empty-state>
      } @else {
        <app-kp-stat-grid [sections]="sections()" [loading]="loading()" />
      }
    </app-page-layout>
    <app-kp-toast position="top-right" />
  `,
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly totalRecords = signal(0);
  readonly sections = signal<KpStatSection[]>([]);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.dashboard.getStats()
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
                const statRoute = STAT_ROUTES[key];
                return {
                  label: stat.label,
                  icon: stat.icon,
                  value: stat.total,
                  route: statRoute?.path,
                  queryParams: statRoute?.queryParams,
                };
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);

            return {
              id: dept.id,
              label: dept.label,
              icon: dept.icon,
              items,
            };
          });
          this.sections.set(groups);
          this.loading.set(false);
          this.loadError.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.messageService.add({
            severity: 'error',
            summary: 'Не удалось загрузить дашборд',
            detail: 'Проверьте подключение и обновите страницу.',
            life: 5000,
          });
        },
      });
  }
}
