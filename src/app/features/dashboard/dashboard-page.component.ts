import { Component, inject, OnInit, signal, model, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
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
import { AuthService } from '../../core/auth.service';
import { READINESS_FEEDBACK } from '../../core/permissions';
import type { ProjectReadinessSnapshot, ReadinessFeedbackSnapshot } from '../../core/project-readiness.model';
import { ReadinessShowcaseComponent } from './readiness-showcase.component';
import { ReadinessFeedbackService } from './readiness-feedback.service';

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

function sectionReadiness(items: KpStatItem[]): number | undefined {
  const percents = items
    .map((item) => item.readinessPercent)
    .filter((value): value is number => value !== undefined);
  if (percents.length === 0) return undefined;
  return Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length);
}

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
    ReadinessShowcaseComponent,
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
        @if (readinessEnabled()) {
          <app-kp-button
            label="Статус реализации"
            icon="pi pi-list-check"
            severity="secondary"
            size="small"
            (buttonClick)="openReadiness()"
          />
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

    <app-readiness-showcase
      [(visible)]="showcaseOpen"
      [snapshot]="readinessSnapshot()"
      [feedback]="feedbackSnapshot()"
      [canEdit]="canEditFeedback()"
      (feedbackUpdated)="reloadFeedback()"
    />
    <app-kp-toast position="top-right" />
  `,
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly feedbackService = inject(ReadinessFeedbackService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly totalRecords = signal(0);
  readonly sections = signal<KpStatSection[]>([]);
  readonly readinessSnapshot = signal<ProjectReadinessSnapshot | null>(null);
  readonly feedbackSnapshot = signal<ReadinessFeedbackSnapshot | null>(null);
  readonly readinessEnabled = signal(false);
  readonly showcaseOpen = model(false);

  readonly canEditFeedback = computed(() => this.auth.hasPermission(READINESS_FEEDBACK.edit));

  ngOnInit(): void {
    this.loadStats();
  }

  openReadiness(): void {
    this.showcaseOpen.set(true);
  }

  reloadFeedback(): void {
    this.feedbackService
      .getFeedback()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((feedback) => this.feedbackSnapshot.set(feedback));
  }

  loadStats(): void {
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      stats: this.dashboard.getStats(),
      readiness: this.dashboard.getReadiness(),
      feedback: this.feedbackService.getFeedback().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats: res, readiness, feedback }) => {
          this.totalRecords.set(res.data.total);
          this.readinessSnapshot.set(readiness);
          this.feedbackSnapshot.set(feedback);
          this.readinessEnabled.set(readiness !== null);

          const groups: KpStatSection[] = DEPT_GROUPS.map((dept) => {
            const items = (DEPT_STAT_KEYS[dept.id] || [])
              .map((key) => {
                const raw = res.data[key];
                if (!raw || typeof raw !== 'object' || !('label' in raw)) return null;
                const stat = raw as DashboardStatItem;
                const statRoute = STAT_ROUTES[key];
                const readinessPercent = readiness?.items[key]?.percent;
                return {
                  label: stat.label,
                  icon: stat.icon,
                  value: stat.total,
                  route: statRoute?.path,
                  queryParams: statRoute?.queryParams,
                  readinessPercent,
                };
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);

            return {
              id: dept.id,
              label: dept.label,
              icon: dept.icon,
              items,
              readinessPercent: readiness ? sectionReadiness(items) : undefined,
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
