import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PageLayoutComponent, KpStatGridComponent, type KpStatSection } from '../../shared/ui';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageLayoutComponent, KpStatGridComponent],
  template: `
    <app-page-layout>
      <div page-header class="page__header">
        <h1>Документы</h1>
        <p class="page__subtitle">
          Коммерческие документы — выберите раздел для работы со списками
        </p>
      </div>

      <app-kp-stat-grid [sections]="sections" [loading]="false" />
    </app-page-layout>
  `,
  styleUrl: './documents-page.component.scss',
})
export class DocumentsPageComponent {
  readonly sections: KpStatSection[] = [
    {
      id: 'documents',
      label: '',
      items: [
        {
          label: 'Коммерческие предложения',
          description: 'Создание и отправка КП контрагентам',
          route: '/quotations',
          icon: 'pi pi-file-edit',
        },
        {
          label: 'Заказы',
          description: 'Заказы клиентов и статусы исполнения',
          route: '/orders',
          icon: 'pi pi-shopping-cart',
        },
        {
          label: 'Запросы',
          description: 'Входящие запросы от компаний',
          route: '/tenders',
          icon: 'pi pi-inbox',
        },
      ],
    },
  ];
}
