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
  styleUrl: './admin-layout.component.scss',
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
            <p-button
              icon="pi pi-sign-out"
              severity="danger"
              size="small"
              (click)="logout()"
              pTooltip="Выйти"
              styleClass="layout__logout"
            />
          </div>
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

  readonly menuItems: MenuItem[] = [
    { label: 'Дашборд', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'Бизнес-процессы', icon: 'pi pi-cubes', route: '/modules' },
    { label: 'Справочники', icon: 'pi pi-book', route: '/directories' },
  ];

  readonly user = this.auth.getUser.bind(this.auth);

  logout(): void {
    this.auth.logout();
  }
}
