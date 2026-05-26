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
          <!-- Секция: Справочники -->
          <h3 class="dashboard__section">📚 Справочники</h3>
          <div class="dashboard__grid">
            @for (item of dirStats(); track item.label) {
              <div
                class="dashboard__card"
                [routerLink]="'/directories'"
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

          <!-- Секция: Бизнес-процессы -->
          <h3 class="dashboard__section">🏭 Бизнес-процессы</h3>
          <div class="dashboard__grid">
            @for (item of moduleStats(); track item.label) {
              <div
                class="dashboard__card"
                [routerLink]="'/modules'"
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
        </div>
      } @else {
        <div class="dashboard dashboard--loading">
          @for (_ of [].constructor(8); track $index) {
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
  readonly dirStats = signal<StatItem[]>([]);
  readonly moduleStats = signal<StatItem[]>([]);

  ngOnInit(): void {
    this.http
      .get<{ success: boolean; data: DashboardStats }>(`${environment.apiUrl}/dashboard/stats`)
      .subscribe({
        next: (res) => {
          this.stats.set(res.data);
          this.dirStats.set([
            res.data.products,
            res.data.categories,
            res.data.counterparties,
            res.data.users,
            res.data.roles,
            res.data.statuses,
            res.data.workTypes,
            res.data.settings,
          ]);
          this.moduleStats.set([
            res.data.quotations,
            res.data.orders,
            res.data.boms,
            res.data.operations,
            res.data.techProcesses,
            res.data.purchaseRequests,
            res.data.purchaseOrders,
            res.data.warehouses,
            res.data.stockMovements,
            res.data.reservations,
            res.data.workOrders,
            res.data.workOrderOperations,
            res.data.costCalculations,
            res.data.actualCosts,
            res.data.shipments,
            res.data.shippingDocs,
            res.data.counters,
            res.data.interactions,
          ]);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
