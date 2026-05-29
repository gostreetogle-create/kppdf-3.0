import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PERMISSIONS } from '../../core/permissions';
import {
  PageLayoutComponent,
  KpStatGridComponent,
  EmptyStateComponent,
  KpButtonComponent,
  type KpStatSection,
} from '../../shared/ui';

interface HubCardDef {
  label: string;
  description: string;
  route: string;
  icon: string;
  requiresAny: string[];
}

@Component({
  selector: 'app-documents-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageLayoutComponent, KpStatGridComponent, EmptyStateComponent, KpButtonComponent],
  template: `
    <app-page-layout>
      <div page-header class="page__header">
        <h1>Документы</h1>
        <p class="page__subtitle">
          Выберите тип документа для работы со списками
        </p>
      </div>

      @if ((sections()[0]?.items?.length ?? 0) === 0) {
        <app-empty-state
          icon="pi-folder-open"
          title="Нет доступных разделов документов"
          description="Обратитесь к администратору для назначения прав office.*"
        >
          <div empty-actions>
            <app-kp-button
              label="На главную"
              icon="pi pi-home"
              size="small"
              (buttonClick)="router.navigate(['/dashboard'])"
            />
          </div>
        </app-empty-state>
      } @else {
        <app-kp-stat-grid [sections]="sections()" [loading]="false" />
      }
    </app-page-layout>
  `,
  styleUrl: './documents-page.component.scss',
})
export class DocumentsPageComponent {
  private readonly auth = inject(AuthService);
  readonly router = inject(Router);

  private readonly hubCards: HubCardDef[] = [
    {
      label: 'Коммерческие предложения',
      description: 'Создание и отправка КП контрагентам',
      route: '/quotations',
      icon: 'pi pi-file-edit',
      requiresAny: [PERMISSIONS.quotations.view],
    },
    {
      label: 'Заказы',
      description: 'Заказы клиентов и статусы исполнения',
      route: '/orders',
      icon: 'pi pi-shopping-cart',
      requiresAny: [PERMISSIONS.orders.view],
    },
    {
      label: 'Запросы',
      description: 'Входящие запросы от компаний',
      route: '/tenders',
      icon: 'pi pi-inbox',
      requiresAny: [PERMISSIONS.tenders.view],
    },
  ];

  readonly sections = computed((): KpStatSection[] => {
    const items = this.hubCards.filter((card) =>
      card.requiresAny.some((p) => this.auth.hasPermission(p)),
    );
    return [
      {
        id: 'documents',
        label: 'Коммерческие документы',
        items,
      },
    ];
  });
}
