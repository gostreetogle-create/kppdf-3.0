import {
  Component,
  input,
  signal,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

export interface KpBreadcrumbItem {
  label: string;
  routerLink?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Главная',
  documents: 'Документы',
  products: 'Товары',
  directories: 'НСИ',
  modules: 'Бизнес-процессы',
  tenders: 'Тендеры',
  quotations: 'Ком. предложения',
  orders: 'Заказы',
  'product-passports': 'Паспорта изделий',
  'work-orders': 'Производственные наряды',
  'purchase-orders': 'Закупки',
  shipments: 'Отгрузки',
  'attribute-definitions': 'Атрибуты',
};

@Component({
  selector: 'app-kp-breadcrumbs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BreadcrumbModule],
  template: `
    @if (visible()) {
      <nav class="kp-breadcrumbs" aria-label="Навигационная цепочка">
        <p-breadcrumb [model]="menuItems()" [home]="homeItem" styleClass="kp-breadcrumbs__trail" />
      </nav>
    }
  `,
  styleUrl: './kp-breadcrumbs.component.scss',
})
export class KpBreadcrumbsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Явный список; если пуст — строится из текущего URL Router. */
  readonly items = input<KpBreadcrumbItem[] | undefined>(undefined);

  readonly menuItems = signal<MenuItem[]>([]);
  readonly visible = signal(false);

  readonly homeItem: MenuItem = {
    icon: 'pi pi-home',
    routerLink: '/dashboard',
    label: 'Главная',
  };

  ngOnInit(): void {
    this.syncFromRouter();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncFromRouter());
  }

  private syncFromRouter(): void {
    const custom = this.items();
    const crumbs = custom?.length ? custom : this.buildFromUrl(this.router.url);
    const trail = this.toMenuItems(crumbs);

    this.menuItems.set(trail);
    this.visible.set(trail.length > 0);
  }

  private buildFromUrl(url: string): KpBreadcrumbItem[] {
    const path = url.split('?')[0].split('#')[0];
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      return [];
    }

    const items: KpBreadcrumbItem[] = [];
    let cumulative = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      cumulative += `/${segment}`;
      const label = ROUTE_LABELS[segment] ?? this.humanizeSegment(segment);
      const isLast = i === segments.length - 1;

      items.push({
        label,
        routerLink: isLast ? undefined : cumulative,
      });
    }

    return items;
  }

  private toMenuItems(items: KpBreadcrumbItem[]): MenuItem[] {
    return items.map((item) => ({
      label: item.label,
      routerLink: item.routerLink,
    }));
  }

  private humanizeSegment(segment: string): string {
    return segment
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
