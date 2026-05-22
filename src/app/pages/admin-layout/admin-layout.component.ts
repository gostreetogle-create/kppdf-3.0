import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, ButtonModule, TooltipModule],
  template: `
    <div class="layout">
      <aside class="layout__sidebar">
        <div class="layout__logo">
          <span class="layout__logo-icon">K</span>
          <span class="layout__logo-text">KPPDF 3.0</span>
        </div>

        <nav class="layout__nav">
          <a
            *ngFor="let item of menuItems"
            class="layout__nav-item"
            [routerLink]="item.route"
            routerLinkActive="layout__nav-item--active"
            [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
          >
            <i [class]="item.icon"></i>
            <span>{{ item.label }}</span>
          </a>
        </nav>

        <div class="layout__footer">
          <div class="layout__user" *ngIf="user()">
            <i class="pi pi-user"></i>
            <div class="layout__user-info">
              <span class="layout__user-name">{{ user()?.username }}</span>
              <span class="layout__user-role">{{ user()?.role }}</span>
            </div>
            <button
              class="layout__logout"
              (click)="logout()"
              pTooltip="Выйти"
            >
              <i class="pi pi-sign-out"></i>
            </button>
          </div>
        </div>
      </aside>
      <main class="layout__main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      height: 100vh;
      background: var(--color-bg);

      &__sidebar {
        width: 240px;
        background: var(--color-sidebar);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }

      &__logo {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 20px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }

      &__logo-icon {
        width: 32px;
        height: 32px;
        background: var(--color-sidebar-active);
        color: #fff;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
      }

      &__logo-text {
        color: #fff;
        font-weight: 600;
        font-size: 15px;
        letter-spacing: -0.3px;
      }

      &__nav {
        display: flex;
        flex-direction: column;
        padding: 8px;
        gap: 2px;
        flex: 1;
      }

      &__nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 6px;
        color: var(--color-sidebar-text);
        text-decoration: none;
        font-size: 14px;
        transition: all 0.15s;

        i { width: 18px; text-align: center; font-size: 15px; }

        &:hover { background: var(--color-sidebar-hover); color: #fff; }

        &--active {
          background: var(--color-sidebar-active) !important;
          color: #fff !important;
          font-weight: 500;
        }
      }

      &__footer {
        padding: 12px;
        border-top: 1px solid rgba(255,255,255,0.06);
      }

      &__user {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-sidebar-text);

        i { font-size: 16px; }
      }

      &__user-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }

      &__user-name {
        font-size: 13px;
        font-weight: 500;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__user-role {
        font-size: 11px;
        color: var(--color-sidebar-text);
        text-transform: capitalize;
      }

      &__logout {
        background: none;
        border: none;
        color: var(--color-sidebar-text);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        transition: all 0.15s;

        &:hover {
          color: #ef4444;
          background: rgba(239,68,68,0.1);
        }
      }

      &__main {
        flex: 1;
        overflow-y: auto;
        min-width: 0;
      }
    }
  `]
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);

  readonly menuItems: MenuItem[] = [
    { label: 'Дашборд', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'Справочники', icon: 'pi pi-book', route: '/directories' },
  ];

  readonly user = this.auth.getUser.bind(this.auth);

  logout(): void {
    this.auth.logout();
  }
}
