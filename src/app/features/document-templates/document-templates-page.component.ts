import { Component, inject, DestroyRef, OnInit, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpSelectComponent,
  KpTextareaComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { createDocumentTemplatesStore } from './document-templates.store';
import { CounterpartyOptionsService } from '../../shared/services/counterparty-options.service';
import { PERMISSIONS } from '../../core/permissions';
import type { CrudAction } from '../../shared/crud/crud-page.types';

const DOC_TYPE_OPTIONS: KpSelectOption[] = [
  { label: 'КП', value: 'quotation' },
  { label: 'Договор', value: 'contract' },
  { label: 'Счёт', value: 'invoice' },
  { label: 'Отгрузка', value: 'shipping' },
];

const YES_NO: KpSelectOption[] = [
  { label: 'Да', value: 'true' },
  { label: 'Нет', value: 'false' },
];

function templateSeverity(value: unknown): string {
  const map: Record<string, string> = {
    true: 'success',
    false: 'secondary',
    quotation: 'info',
    contract: 'warn',
    invoice: 'success',
    shipping: 'secondary',
  };
  return map[String(value)] || 'info';
}

function tagsToStr(tags: unknown): string {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

function strToTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function boolToStr(value: unknown): string {
  return value === true || value === 'true' ? 'true' : 'false';
}

@Component({
  selector: 'app-document-templates-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpCrudPageComponent,
    KpInputComponent,
    KpSelectComponent,
    KpTextareaComponent,
  ],
  template: `
    <app-kp-crud-page
      title="Шаблоны документов"
      entityLabel="шаблона"
      description="Настраиваемые шаблоны печатных форм: КП, договоры, счета"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS['document-templates']"
      [severityFn]="templateSeverity"
      [extraRowActions]="extraActions"
      createLabel="Создать шаблон"
      dialogWidth="min(640px, 96vw)"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input
            label="Название"
            name="name"
            placeholder="Например: Стандартное КП"
            [value]="row['name'] || ''"
            (valueChange)="row['name'] = $event"
            [required]="true"
          />
          <app-kp-textarea
            label="Описание"
            name="description"
            placeholder="Краткое описание шаблона"
            [value]="row['description'] || ''"
            (valueChange)="row['description'] = $event"
            [rows]="2"
          />
          <app-kp-input
            label="Теги (через запятую)"
            name="tags"
            placeholder="Например: базовый, кп"
            [value]="tagsToStr(row['tags'])"
            (valueChange)="row['tags'] = strToTags($event)"
          />
          <app-kp-select
            label="Организация"
            name="organizationId"
            placeholder="Выберите организацию"
            [value]="row['organizationId'] || ''"
            (valueChange)="row['organizationId'] = $event"
            [options]="orgOptions()"
            [required]="true"
          />
          <app-kp-select
            label="Тип документа"
            name="docType"
            placeholder="Выберите документ"
            [value]="row['docType'] || 'quotation'"
            (valueChange)="row['docType'] = $event"
            [options]="docTypeOptions"
            [required]="true"
          />
          <app-kp-select
            label="По умолчанию"
            name="isDefault"
            placeholder="Выберите"
            [value]="boolToStr(row['isDefault'] ?? false)"
            (valueChange)="row['isDefault'] = $event === 'true'"
            [options]="yesNoOptions"
          />
          <app-kp-select
            label="Активен"
            name="isActive"
            placeholder="Выберите"
            [value]="boolToStr(row['isActive'] ?? true)"
            (valueChange)="row['isActive'] = $event === 'true'"
            [options]="yesNoOptions"
          />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class DocumentTemplatesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly orgService = inject(CounterpartyOptionsService);
  readonly store = createDocumentTemplatesStore(this.destroyRef);
  readonly PERMISSIONS = PERMISSIONS;
  readonly docTypeOptions = DOC_TYPE_OPTIONS;
  readonly yesNoOptions = YES_NO;
  readonly templateSeverity = templateSeverity;
  private readonly router = inject(Router);
  readonly orgOptions = signal<KpSelectOption[]>([]);

  /** Дополнительные действия в строке таблицы */
  readonly extraActions: CrudAction<Record<string, unknown>>[] = [
    {
      id: 'edit-blocks',
      label: 'Редактировать блоки',
      icon: 'pi pi-pen-to-square',
      severity: 'info',
      handler: (row: Record<string, unknown>) => {
        const id = row['_id'] as string;
        if (id) void this.router.navigate(['/document-templates', id]);
      },
    },
  ];

  /** Columns as a computed signal — reactively updates when orgOptions load */
  readonly columns = computed<KpColumn[]>(() => [
    { field: 'name', header: 'Название', type: 'text', sortable: true },
    { field: 'docType', header: 'Тип', type: 'tag', options: DOC_TYPE_OPTIONS, sortable: true, width: '110px' },
    { field: 'organizationId', header: 'Организация', type: 'select', options: this.orgOptions(), sortable: true, width: '160px' },
    { field: 'description', header: 'Описание', type: 'text', width: '200px' },
    { field: 'tags', header: 'Теги', type: 'text', width: '150px' },
    { field: 'isDefault', header: 'По умолч.', type: 'tag', options: YES_NO, width: '100px' },
    { field: 'isActive', header: 'Активен', type: 'tag', options: YES_NO, width: '90px' },
  ]);

  ngOnInit(): void {
    this.orgService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options: KpSelectOption[]) => this.orgOptions.set(options),
        error: () => this.orgOptions.set([]),
      });
  }

  tagsToStr = tagsToStr;
  strToTags = strToTags;
  boolToStr = boolToStr;
}
