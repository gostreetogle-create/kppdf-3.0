import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { KpButtonComponent } from '../../shared/ui';
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
  label: string;
  items: FlatMenuItem[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, KpButtonComponent],
  styleUrl: './admin-layout.component.scss',
  template: `
    <div class="layout">
      <aside class="layout__sidebar">
        <div class="layout__logo">
          <span class="layout__logo-icon">K</span>
          <span class="layout__logo-text">KPPDF 3.0</span>
        </div>

        <nav class="layout__nav" aria-label="Основная навигация">
          @for (item of topItems; track item.label) {
            <a
              class="layout__nav-item"
              [routerLink]="item.route"
              routerLinkActive="layout__nav-item--active"
              [routerLinkActiveOptions]="{exact: true}"
            >
              <i [class]="item.icon" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
            </a>
          }

          @for (group of visibleGroups(); track group.label) {
            <span class="layout__group-label">{{ group.label }}</span>
            @for (item of group.items; track item.label) {
              <a
                class="layout__nav-item"
                [routerLink]="item.route"
                routerLinkActive="layout__nav-item--active"
                [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
              >
                <i [class]="item.icon" aria-hidden="true"></i>
                <span>{{ item.label }}</span>
              </a>
            }
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
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);

  readonly topItems: FlatMenuItem[] = [
    { label: 'Дашборд', icon: 'pi pi-home', route: '/dashboard', alwaysShow: true },
  ];

  readonly menuGroups: MenuGroup[] = [
    {
      label: 'Коммерция',
      items: [
        { label: 'Документы', icon: 'pi pi-folder-open', route: '/documents', alwaysShow: true },
        { label: 'Запросы', icon: 'pi pi-inbox', route: '/tenders', requiresAny: [PERMISSIONS.tenders.view] },
        { label: 'КП', icon: 'pi pi-file-edit', route: '/quotations', requiresAny: [PERMISSIONS.quotations.view] },
        { label: 'Заказы', icon: 'pi pi-shopping-cart', route: '/orders', requiresAny: [PERMISSIONS.orders.view] },
      ],
    },
    {
      label: 'Производство',
      items: [
        { label: 'Бизнес-процессы', icon: 'pi pi-cubes', route: '/modules', alwaysShow: true },
        { label: 'Паспорта', icon: 'pi pi-id-card', route: '/product-passports', requiresAny: [PERMISSIONS['product-passports'].view] },
        { label: 'Наряды', icon: 'pi pi-wrench', route: '/work-orders', requiresAny: [PERMISSIONS['work-orders'].view] },
      ],
    },
    {
      label: 'Склад',
      items: [
        { label: 'Заказы пост.', icon: 'pi pi-truck', route: '/purchase-orders', requiresAny: [PERMISSIONS['purchase-orders'].view] },
        { label: 'Отгрузки', icon: 'pi pi-send', route: '/shipments', requiresAny: [PERMISSIONS.shipments.view] },
      ],
    },
    {
      label: 'Справочники',
      items: [
        { label: 'Товары', icon: 'pi pi-box', route: '/products', requiresAny: [PERMISSIONS.products.view] },
        { label: 'Справочники', icon: 'pi pi-book', route: '/directories', requiresAny: ['admin.*', PERMISSIONS.counterparties.view] },
        { label: 'Атрибуты EAV', icon: 'pi pi-sliders-h', route: '/attribute-definitions', requiresAny: [PERMISSIONS.attributes.view] },
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
