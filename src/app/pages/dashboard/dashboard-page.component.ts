import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface StatItem {
  total: number;
  label: string;
  icon: string;
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
  total: number;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CardModule, ButtonModule, RouterLink, NgFor, NgIf],
  template: `
    <div class="page">
      <div class="page__header">
        <h1>Дашборд</h1>
        <span class="page__subtitle" *ngIf="!loading()">
          Всего записей: <strong>{{ stats()?.total }}</strong>
        </span>
      </div>

      <div class="dashboard" *ngIf="!loading(); else loadingTpl">
        <div
          class="dashboard__card"
          *ngFor="let item of statList()"
          [routerLink]="item.route"
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
      </div>

      <ng-template #loadingTpl>
        <div class="dashboard dashboard--loading">
          <div *ngFor="let _ of [].constructor(8)" class="dashboard__skeleton">
            <div class="dashboard__skeleton-icon"></div>
            <div class="dashboard__skeleton-text"></div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);
  readonly statList = signal<(StatItem & { route: string })[]>([]);

  ngOnInit(): void {
    this.http
      .get<{ success: boolean; data: DashboardStats }>(`${environment.apiUrl}/dashboard/stats`)
      .subscribe({
        next: (res) => {
          this.stats.set(res.data);
          this.statList.set([
            { ...res.data.products, route: '/directories' },
            { ...res.data.categories, route: '/directories' },
            { ...res.data.counterparties, route: '/directories' },
            { ...res.data.users, route: '/directories' },
            { ...res.data.roles, route: '/directories' },
            { ...res.data.statuses, route: '/directories' },
            { ...res.data.workTypes, route: '/directories' },
            { ...res.data.settings, route: '/directories' },
          ]);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
