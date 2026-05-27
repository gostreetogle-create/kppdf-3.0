import { Component, inject, OnInit, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import {
  KpStatGridComponent,
  KpToastComponent,
  KpButtonComponent,
  EmptyStateComponent,
  PageLayoutComponent,
  type KpStatSection,
} from '../../shared/ui';
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
  imports: [KpStatGridComponent, KpToastComponent, KpButtonComponent, EmptyStateComponent, PageLayoutComponent],
  template: `
    <app-page-layout>
      <div page-header class="page__header">
        <h1>Дашборд</h1>
        @if (!loading() && !loadError()) {
          <span class="page__subtitle">
            Всего записей: <strong>{{ totalRecords() }}</strong>
          </span>
        }
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
