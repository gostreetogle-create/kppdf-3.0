import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageLayoutComponent, KpCardComponent } from '../../shared/ui';

interface DocHubLink {
  title: string;
  description: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-documents-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageLayoutComponent, KpCardComponent],
  styleUrl: './documents-page.component.scss',
  template: `
    <app-page-layout>
      <div page-header class="page__header">
        <h1>Документы</h1>
        <p class="page__subtitle">
          Коммерческие документы — выберите раздел для работы со списками
        </p>
      </div>

      <div class="documents-hub">
        @for (link of links; track link.route) {
          <a [routerLink]="link.route" class="documents-hub__card">
            <app-kp-card>
              <div class="documents-hub__card-body">
                <i [class]="link.icon + ' documents-hub__icon'" aria-hidden="true"></i>
                <div>
                  <h2 class="documents-hub__title">{{ link.title }}</h2>
                  <p class="documents-hub__desc">{{ link.description }}</p>
                </div>
                <i class="pi pi-arrow-right documents-hub__arrow" aria-hidden="true"></i>
              </div>
            </app-kp-card>
          </a>
        }
      </div>
    </app-page-layout>
  `,
})
export class DocumentsPageComponent {
  readonly links: DocHubLink[] = [
    {
      title: 'Коммерческие предложения',
      description: 'Создание и отправка КП контрагентам',
      route: '/quotations',
      icon: 'pi pi-file-edit',
    },
    {
      title: 'Заказы',
      description: 'Заказы клиентов и статусы исполнения',
      route: '/orders',
      icon: 'pi pi-shopping-cart',
    },
    {
      title: 'Запросы',
      description: 'Входящие запросы от компаний',
      route: '/tenders',
      icon: 'pi pi-inbox',
    },
  ];
}
