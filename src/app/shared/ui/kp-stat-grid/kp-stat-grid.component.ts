import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KpCardComponent } from '../kp-card.component';

export interface KpStatItem {
  label: string;
  icon: string;
  route?: string;
  /** Режим метрики (дашборд) */
  value?: number | string;
  /** Режим hub-карточки (разделы, документы) */
  description?: string;
}

export interface KpStatSection {
  id: string;
  label: string;
  icon?: string;
  items: KpStatItem[];
}

@Component({
  selector: 'app-kp-stat-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KpCardComponent],
  template: `
    @if (loading()) {
      <div class="kp-stat-grid kp-stat-grid--loading" role="status" aria-live="polite">
        @for (_ of skeletonSlots(); track $index) {
          <div class="kp-stat-grid__skeleton">
            <div class="kp-stat-grid__skeleton-icon"></div>
            <div class="kp-stat-grid__skeleton-text"></div>
          </div>
        }
      </div>
    } @else {
      @for (section of sections(); track section.id) {
        @if (section.items.length > 0) {
          @if (section.label) {
            <h2 class="kp-stat-grid__section">
              @if (section.icon) {
                <i [class]="section.icon + ' kp-stat-grid__section-icon'" aria-hidden="true"></i>
              }
              {{ section.label }}
            </h2>
          }
          <div class="kp-stat-grid__grid">
            @for (item of section.items; track item.label) {
              <a
                class="kp-stat-grid__card"
                [class.kp-stat-grid__card--hub]="isHubItem(item)"
                [routerLink]="item.route || '/'"
              >
                <app-kp-card>
                  @if (isHubItem(item)) {
                    <div class="kp-stat-grid__hub-body">
                      <i [class]="item.icon + ' kp-stat-grid__hub-icon'" aria-hidden="true"></i>
                      <div class="kp-stat-grid__hub-text">
                        <span class="kp-stat-grid__hub-title">{{ item.label }}</span>
                        @if (item.description) {
                          <span class="kp-stat-grid__hub-desc">{{ item.description }}</span>
                        }
                      </div>
                      <i class="pi pi-arrow-right kp-stat-grid__hub-arrow" aria-hidden="true"></i>
                    </div>
                  } @else {
                    <div class="kp-stat-grid__metric-body">
                      <i [class]="item.icon + ' kp-stat-grid__metric-icon'" aria-hidden="true"></i>
                      <div class="kp-stat-grid__metric-info">
                        <span class="kp-stat-grid__metric-value">{{ item.value ?? 0 }}</span>
                        <span class="kp-stat-grid__metric-label">{{ item.label }}</span>
                      </div>
                    </div>
                  }
                </app-kp-card>
              </a>
            }
          </div>
        }
      }
    }
  `,
  styleUrl: './kp-stat-grid.component.scss',
})
export class KpStatGridComponent {
  readonly sections = input<KpStatSection[]>([]);
  readonly loading = input(false);
  readonly skeletonCount = input(12);

  readonly skeletonSlots = computed(() => Array.from({ length: this.skeletonCount() }));

  isHubItem(item: KpStatItem): boolean {
    return item.value === undefined && !!item.description;
  }
}
