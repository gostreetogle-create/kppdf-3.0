import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  /** Проверка — показывать пункт, только если есть хотя бы одно из этих разрешений */
  requiresAny?: string[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, TooltipModule],
  styleUrl: './admin-layout.component.scss',
  template: `
    <div class="layout">
      <aside class="layout__sidebar">
        <div class="layout__logo">
          <span class="layout__logo-icon">K</span>
          <span class="layout__logo-text">KPPDF 3.0</span>
        </div>

        <nav class="layout__nav">
          @for (item of visibleMenuItems(); track item.label) {
            <a
              class="layout__nav-item"
              [routerLink]="item.route"
              routerLinkActive="layout__nav-item--active"
              [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
            >
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="layout__footer">
          @if (user()) {
            <div class="layout__user">
              <i class="pi pi-user"></i>
              <div class="layout__user-info">
                <span class="layout__user-name">{{ user()?.username }}</span>
                <span class="layout__user-role">{{ getRoleLabel(user()?.role || '') }}</span>
              </div>
              <p-button
                icon="pi pi-sign-out"
                severity="danger"
                size="small"
                (click)="logout()"
                pTooltip="Выйти"
                styleClass="layout__logout"
              />
            </div>
          }
        </div>
      </aside>
      <main class="layout__main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);

  readonly menuItems: (MenuItem & { alwaysShow?: boolean })[] = [
    { label: 'Дашборд', icon: 'pi pi-home', route: '/dashboard', alwaysShow: true },
    { label: 'Документы', icon: 'pi pi-file-edit', route: '/documents', alwaysShow: true },
    { label: 'Бизнес-процессы', icon: 'pi pi-cubes', route: '/modules', alwaysShow: true },
    { label: 'Справочники', icon: 'pi pi-book', route: '/directories', requiresAny: ['admin.*'] },
  ];

  readonly visibleMenuItems = computed(() =>
    this.menuItems.filter((item) => {
      if (item.alwaysShow) return true;
      if (item.requiresAny) {
        return item.requiresAny.some((p) => this.auth.hasPermission(p));
      }
      return true;
    }),
  );

  readonly user = this.auth.getUser.bind(this.auth);

  /** Читаемые названия ролей */
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

  logout(): void {
    this.auth.logout();
  }
}
