import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { KpButtonComponent, KpBreadcrumbsComponent } from '../../shared/ui';
import { AuthService } from '../../core/auth.service';
import { PERMISSIONS } from '../../core/permissions';

interface FlatMenuItem {
  label: string;
  icon: string;
  route: string;
  requiresAny?: string[];
  alwaysShow?: boolean;
}

interface MenuGroup {
  id: 'sales' | 'production' | 'warehouse' | 'directories' | 'admin';
  label: string;
  items: FlatMenuItem[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, KpButtonComponent, KpBreadcrumbsComponent],
  styleUrl: './admin-layout.component.scss',
  template: `
    <div class="layout" [class.layout--sidebar-open]="sidebarOpen()">
      @if (sidebarOpen()) {
        <button
          type="button"
          class="layout__overlay"
          aria-label="Закрыть меню"
          (click)="closeSidebar()"
        ></button>
      }

      <header class="layout__mobile-header">
        <app-kp-button
          icon="pi pi-bars"
          severity="secondary"
          [text]="true"
          size="small"
          ariaLabel="Открыть меню"
          (buttonClick)="toggleSidebar()"
        />
        <span class="layout__mobile-title">KPPDF 3.0</span>
      </header>

      <aside class="layout__sidebar" [class.layout__sidebar--open]="sidebarOpen()">
        <div class="layout__logo">
          <span class="layout__logo-icon">K</span>
          <span class="layout__logo-text">KPPDF 3.0</span>
        </div>

        <nav class="layout__nav" aria-label="Основная навигация">
          <div class="layout__nav-top">
            @for (item of topItems; track item.label) {
              <a
                class="layout__nav-item"
                [routerLink]="item.route"
                routerLinkActive="layout__nav-item--active"
                [routerLinkActiveOptions]="{exact: true}"
                (click)="closeSidebar()"
              >
                <i [class]="item.icon" aria-hidden="true"></i>
                <span>{{ item.label }}</span>
              </a>
            }
          </div>

          @for (group of visibleGroups(); track group.id) {
            <div class="layout__group" [class]="'layout__group layout__group--' + group.id">
              <div class="layout__group-label">
                <span class="layout__group-dot" aria-hidden="true"></span>
                <span>{{ group.label }}</span>
              </div>
              @for (item of group.items; track item.label) {
                <a
                  class="layout__nav-item"
                  [routerLink]="item.route"
                  routerLinkActive="layout__nav-item--active"
                  [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
                  (click)="closeSidebar()"
                >
                  <i [class]="item.icon" aria-hidden="true"></i>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          }
        </nav>

        <div class="layout__footer">
          @if (user()) {
            <div class="layout__user">
              <div class="layout__user-avatar">{{ getInitials(user()?.username || '') }}</div>
              <div class="layout__user-info">
                <span class="layout__user-name">{{ user()?.username }}</span>
                <span class="layout__user-role">{{ getRoleLabel(user()?.role || '') }}</span>
              </div>
              <app-kp-button
                icon="pi pi-sign-out"
                severity="danger"
                size="small"
                tooltip="Выйти"
                ariaLabel="Выйти из системы"
                styleClass="layout__logout"
                (buttonClick)="logout()"
              />
            </div>
          }
        </div>
      </aside>

      <main class="layout__main" aria-label="Содержимое страницы">
        <app-kp-breadcrumbs />
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);

  readonly sidebarOpen = signal(false);

  readonly topItems: FlatMenuItem[] = [
    { label: 'Главная', icon: 'pi pi-home', route: '/dashboard', alwaysShow: true },
  ];

  readonly menuGroups: MenuGroup[] = [
    {
      id: 'sales',
      label: 'Продажи',
      items: [
        { label: 'Документы', icon: 'pi pi-folder-open', route: '/documents', alwaysShow: true },
        { label: 'Тендеры', icon: 'pi pi-inbox', route: '/tenders', requiresAny: [PERMISSIONS.tenders.view] },
        {
          label: 'Ком. предложения',
          icon: 'pi pi-file-edit',
          route: '/quotations',
          requiresAny: [PERMISSIONS.quotations.view],
        },
        { label: 'Заказы', icon: 'pi pi-shopping-cart', route: '/orders', requiresAny: [PERMISSIONS.orders.view] },
      ],
    },
    {
      id: 'production',
      label: 'Производство',
      items: [
        { label: 'Модули', icon: 'pi pi-cubes', route: '/modules', alwaysShow: true },
        {
          label: 'Паспорта изделий',
          icon: 'pi pi-id-card',
          route: '/product-passports',
          requiresAny: [PERMISSIONS['product-passports'].view],
        },
        {
          label: 'Производственные наряды',
          icon: 'pi pi-wrench',
          route: '/work-orders',
          requiresAny: [PERMISSIONS['work-orders'].view],
        },
      ],
    },
    {
      id: 'warehouse',
      label: 'Склад',
      items: [
        {
          label: 'Закупки',
          icon: 'pi pi-truck',
          route: '/purchase-orders',
          requiresAny: [PERMISSIONS['purchase-orders'].view],
        },
        { label: 'Отгрузки', icon: 'pi pi-send', route: '/shipments', requiresAny: [PERMISSIONS.shipments.view] },
      ],
    },
    {
      id: 'directories',
      label: 'Справочники',
      items: [
        { label: 'Товары', icon: 'pi pi-box', route: '/products', requiresAny: [PERMISSIONS.products.view] },
      ],
    },
    {
      id: 'admin',
      label: 'Администрирование',
      items: [
        {
          label: 'НСИ',
          icon: 'pi pi-book',
          route: '/directories',
          requiresAny: ['admin.*', PERMISSIONS.counterparties.view],
        },
        {
          label: 'Атрибуты',
          icon: 'pi pi-sliders-h',
          route: '/attribute-definitions',
          requiresAny: [PERMISSIONS.attributes.view],
        },
        {
          label: 'Типы таблиц',
          icon: 'pi pi-table',
          route: '/document-table-types',
          requiresAny: [PERMISSIONS['document-table-types'].view],
        },
      ],
    },
  ];

  readonly visibleGroups = computed(() =>
    this.menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.alwaysShow) return true;
          if (item.requiresAny) {
            return item.requiresAny.some((p) => this.auth.hasPermission(p));
          }
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0),
  );

  readonly user = this.auth.getUser.bind(this.auth);

  private readonly roleLabels: Record<string, string> = {
    admin: 'Администратор',
    director: 'Директор',
    manager: 'Менеджер',
    accountant: 'Бухгалтер',
    engineer: 'Инженер',
    foreman: 'Мастер цеха',
    storekeeper: 'Зав. складом',
    purchaser: 'Снабженец',
    viewer: 'Наблюдатель',
  };

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  getRoleLabel(role: string): string {
    return this.roleLabels[role] || role;
  }

  getInitials(name: string): string {
    return name
      .split(/[\s.@_]+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  logout(): void {
    this.auth.logout();
  }
}
