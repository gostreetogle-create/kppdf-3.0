import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, tap, catchError, finalize } from 'rxjs';

import type { IQuotation } from '../../../../shared/types';

// PrimeNG — known tech debt: QuotationEditor is P0, migration to kp-* out of scope (AGENTS.md §UI-кит)
/* eslint-disable no-restricted-imports */
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
/* eslint-enable no-restricted-imports */
import { MessageService } from 'primeng/api';

// Services
import { CrudApiService } from '../../shared/services/crud-api.service';

// ===== Types =====
interface QuotationItem {
  _id?: string;
  productId?: string;
  sku: string;
  photo?: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  sum: number;
  order: number;
}

interface EditorBlock {
  _id?: string;
  type: 'text' | 'table' | 'header' | 'separator';
  order: number;
  title?: string;
  content: string;
  settings: {
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'semibold';
    align: 'left' | 'center' | 'right';
    paddingTop: number;
    paddingBottom: number;
  };
}

interface DocumentTemplate {
  _id?: string;
  name: string;
  organizationId?: string;
  docType: string;
  isDefault: boolean;
  backgroundImage?: string;
  blocks: EditorBlock[];
}

const DEFAULT_BLOCKS: EditorBlock[] = [
  {
    type: 'header',
    order: 0,
    content: '<h2>Коммерческое предложение</h2>',
    settings: { fontSize: 18, fontWeight: 'bold', align: 'center', paddingTop: 20, paddingBottom: 12 },
  },
  {
    type: 'text',
    order: 1,
    title: 'Информация',
    content: 'Поставщик: [Название организации]\nИНН: [ИНН]\nАдрес: [Адрес]\n\nКлиент: [Название клиента]',
    settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 },
  },
  {
    type: 'table',
    order: 2,
    title: 'Товары',
    content: '',
    settings: { fontSize: 10, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 },
  },
  {
    type: 'text',
    order: 3,
    title: 'Условия',
    content: 'Условия оплаты: предоплата 100%\nСрок поставки: [количество] рабочих дней\nГарантия: [срок]',
    settings: { fontSize: 10, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 },
  },
  {
    type: 'separator',
    order: 4,
    content: '',
    settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 4, paddingBottom: 4 },
  },
  {
    type: 'text',
    order: 5,
    content: 'Руководитель: ___________________  (подпись)',
    settings: { fontSize: 11, fontWeight: 'normal', align: 'right', paddingTop: 20, paddingBottom: 8 },
  },
];

@Component({
  selector: 'app-quotation-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgFor, NgIf, NgSwitch, NgSwitchCase, DecimalPipe, SlicePipe, FormsModule,
    ButtonModule, InputTextModule, InputNumberModule, SelectModule, TextareaModule,
    ToastModule, TooltipModule, DialogModule, TagModule,
  ],
  providers: [MessageService],
  template: `
    <div class="editor">
      <!-- ═══ Top Toolbar ═══ -->
      <header class="editor__toolbar">
        <div class="editor__toolbar-left">
          <p-button
            icon="pi pi-arrow-left"
            severity="secondary"
            [text]="true"
            size="small"
            (click)="goBack()"
            pTooltip="Назад к списку"
          />
          <span class="editor__toolbar-title">
            {{ isNew() ? 'Новое КП' : 'КП №' + quotation().number }}
          </span>
          <span class="editor__toolbar-status">
            <p-tag
              *ngIf="quotation().statusId"
              [value]="quotation().statusId"
              [severity]="getSeverity(quotation().statusId)"
            />
          </span>
        </div>
        <div class="editor__toolbar-right">
          <p-button
            label="Шаблоны"
            icon="pi pi-palette"
            severity="secondary"
            [outlined]="true"
            size="small"
            (click)="showTemplates = true"
            pTooltip="Выбрать/сохранить шаблон оформления"
          />
          <p-button
            label="Сохранить"
            icon="pi pi-check"
            size="small"
            (click)="save()"
            [loading]="saving()"
          />
        </div>
      </header>

      <!-- ═══ Main Layout: A4 Canvas + Right Panel ═══ -->
      <div class="editor__body">
        <!-- A4 Canvas -->
        <div class="editor__canvas-wrapper">
          <div
            class="editor__canvas"
            [style.background-image]="getBackgroundCss()"
          >
            <!-- Blocks -->
            <div class="editor__blocks">
              <div
                *ngFor="let block of blocks(); trackBy: trackByBlock; let i = index"
                class="editor__block"
                [class.editor__block--table]="block.type === 'table'"
                [class.editor__block--header]="block.type === 'header'"
                [class.editor__block--separator]="block.type === 'separator'"
              >
                <!-- Block Controls (hover) -->
                <div class="editor__block-controls">
                  <p-button
                    icon="pi pi-chevron-up"
                    [rounded]="true"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    (click)="moveBlock(i, -1)"
                    [disabled]="i === 0"
                    pTooltip="Выше"
                  />
                  <p-button
                    icon="pi pi-chevron-down"
                    [rounded]="true"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    (click)="moveBlock(i, 1)"
                    [disabled]="i === blocks().length - 1"
                    pTooltip="Ниже"
                  />

                  <ng-container [ngSwitch]="block.type">
                    <p-button
                      *ngSwitchCase="'text'"
                      icon="pi pi-pencil"
                      [rounded]="true"
                      [text]="true"
                      severity="secondary"
                      size="small"
                      (click)="editTextBlock(i)"
                      pTooltip="Редактировать текст"
                    />
                    <p-button
                      *ngSwitchCase="'separator'"
                      icon="pi pi-minus"
                      [rounded]="true"
                      [text]="true"
                      severity="secondary"
                      size="small"
                      (click)="editBlockSettings(i)"
                      pTooltip="Настройки"
                    />
                  </ng-container>

                  <p-button
                    icon="pi pi-trash"
                    [rounded]="true"
                    [text]="true"
                    severity="danger"
                    size="small"
                    (click)="removeBlock(i)"
                    pTooltip="Удалить"
                    [disabled]="blocks().length <= 1"
                  />
                </div>

                <!-- Block Content -->
                <!-- Header -->
                <div *ngIf="block.type === 'header'" class="editor__block-content"
                  [style.text-align]="block.settings.align"
                  [style.font-size.px]="block.settings.fontSize"
                  [style.font-weight]="block.settings.fontWeight"
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                >
                  <div [innerHTML]="block.content"></div>
                </div>

                <!-- Text Card -->
                <div *ngIf="block.type === 'text'" class="editor__block-content editor__text-card"
                  [style.text-align]="block.settings.align"
                  [style.font-size.px]="block.settings.fontSize"
                  [style.font-weight]="block.settings.fontWeight"
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                >
                  <div class="editor__text-card-content" (dblclick)="editTextBlock(i)">
                    {{ block.title ? '[' + block.title + ']' : '' }}
                    {{ block.content | slice:0:200 }}{{ block.content.length > 200 ? '...' : '' }}
                  </div>
                </div>

                <!-- Separator -->
                <div *ngIf="block.type === 'separator'" class="editor__block-content"
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                >
                  <hr class="editor__separator" />
                </div>

                <!-- Table Block -->
                <div *ngIf="block.type === 'table'" class="editor__table-wrapper">
                  <div class="editor__table-toolbar">
                    <span class="editor__table-title">Товары</span>
                    <p-button
                      label="Добавить товар"
                      icon="pi pi-plus"
                      size="small"
                      (click)="addItem()"
                    />
                  </div>

                  <table class="editor__table">
                    <thead>
                      <tr>
                        <th style="width:40px">№</th>
                        <th style="width:60px">Арт.</th>
                        <th style="width:60px">Фото</th>
                        <th>Наименование</th>
                        <th style="width:70px">Кол-во</th>
                        <th style="width:50px">Ед.</th>
                        <th style="width:90px">Цена, ₽</th>
                        <th style="width:100px">Сумма, ₽</th>
                        <th style="width:40px"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of items(); trackBy: trackByItem; let i = index">
                        <td class="editor__table-idx">{{ i + 1 }}</td>
                        <td>
                          <input
                            pInputText
                            size="small"
                            [(ngModel)]="item.sku"
                            class="editor__table-input"
                            placeholder="Арт."
                          />
                        </td>
                        <td>
                          <div class="editor__table-photo" (click)="showPhotoInput(i)" (keydown.enter)="showPhotoInput(i)" tabindex="0" role="button">
                            <i class="pi pi-image" *ngIf="!item.photo"></i>
                            <img *ngIf="item.photo" [src]="item.photo" class="editor__table-photo-img" alt="фото" />
                          </div>
                        </td>
                        <td>
                          <input
                            pInputText
                            size="small"
                            [(ngModel)]="item.name"
                            class="editor__table-input editor__table-input--wide"
                            placeholder="Наименование товара"
                          />
                        </td>
                        <td>
                          <p-inputNumber
                            [(ngModel)]="item.qty"
                            size="small"
                            class="editor__table-number"
                            [min]="0"
                            (onValueChange)="recalcItem(i)"
                          />
                        </td>
                        <td>
                          <input
                            pInputText
                            size="small"
                            [(ngModel)]="item.unit"
                            class="editor__table-input"
                            placeholder="шт"
                          />
                        </td>
                        <td>
                          <p-inputNumber
                            [(ngModel)]="item.price"
                            size="small"
                            class="editor__table-number"
                            [min]="0"
                            [minFractionDigits]="2"
                            [maxFractionDigits]="2"
                            (onValueChange)="recalcItem(i)"
                          />
                        </td>
                        <td class="editor__table-sum">
                          {{ computeSum(item) | number:'1.2-2' }}
                        </td>
                        <td>
                          <p-button
                            icon="pi pi-trash"
                            [rounded]="true"
                            [text]="true"
                            severity="danger"
                            size="small"
                            (click)="removeItem(i)"
                          />
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="7" class="editor__table-total-label">Итого:</td>
                        <td class="editor__table-total">{{ totalSum() | number:'1.2-2' }}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <!-- Add Block FAB -->
            <div class="editor__add-fab">
              <p-button
                icon="pi pi-plus"
                [rounded]="true"
                severity="primary"
                pTooltip="Добавить блок"
                (click)="showAddMenu = !showAddMenu"
              />
              <div class="editor__add-menu" *ngIf="showAddMenu" (click)="showAddMenu = false" (keydown.enter)="showAddMenu = false" tabindex="-1" role="presentation">
                <p-button label="Текстовый блок" icon="pi pi-align-left" [text]="true" size="small" (click)="addBlock('text')" />
                <p-button label="Разделитель" icon="pi pi-minus" [text]="true" size="small" (click)="addBlock('separator')" />
              </div>
            </div>
          </div>
        </div>

        <!-- Side info panel -->
        <aside class="editor__sidebar">
          <div class="editor__sidebar-section">
            <h3 class="editor__sidebar-title">Реквизиты</h3>
            <div class="editor__sidebar-field">
              <label>Номер</label>
              <input pInputText size="small" [(ngModel)]="quotation().number" readonly class="w-full" />
            </div>
            <div class="editor__sidebar-field">
              <label>Дата</label>
              <input pInputText size="small" [(ngModel)]="quotationDate" class="w-full" />
            </div>
            <div class="editor__sidebar-field">
              <label>Контрагент</label>
              <input pInputText size="small" [(ngModel)]="quotation().counterpartyId" class="w-full" placeholder="ID контрагента" />
            </div>
            <div class="editor__sidebar-field">
              <label>Действует до</label>
              <input pInputText size="small" [(ngModel)]="quotationValidUntil" class="w-full" />
            </div>
          </div>

          <div class="editor__sidebar-section">
            <h3 class="editor__sidebar-title">Фон документа</h3>
            <div class="editor__sidebar-field">
              <p-button
                [label]="quotationBg ? 'Изменить фон' : 'Загрузить фон'"
                icon="pi pi-image"
                severity="secondary"
                [outlined]="true"
                size="small"
                (click)="showBgInput()"
                class="w-full"
              />
              <p-button
                *ngIf="quotationBg"
                label="Удалить фон"
                icon="pi pi-times"
                severity="danger"
                [text]="true"
                size="small"
                (click)="removeBackgroundImage()"
              />
            </div>
          </div>

          <div class="editor__sidebar-section">
            <h3 class="editor__sidebar-title">Примечание</h3>
            <textarea
              pInputTextarea
              [(ngModel)]="quotation().notes"
              rows="4"
              class="w-full"
              placeholder="Примечание к документу..."
            ></textarea>
          </div>
        </aside>
      </div>
    </div>

    <!-- ═══ Template Dialog ═══ -->
    <p-dialog
      [(visible)]="showTemplates"
      header="Шаблоны оформления"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '520px', maxWidth: '90vw' }"
    >
      <div class="tmpl-list">
        <div class="tmpl-list__header">
          <p-button
            label="Сохранить как шаблон"
            icon="pi pi-save"
            size="small"
            (click)="showSaveTemplateInput()"
            [outlined]="true"
          />
        </div>

        <div class="tmpl-list__items">
          <div
            *ngFor="let tmpl of templates(); trackBy: trackByTemplate"
            class="tmpl-card"
            [class.tmpl-card--active]="activeTemplateId() === tmpl._id"
            (click)="applyTemplate(tmpl)" (keydown.enter)="applyTemplate(tmpl)" tabindex="0" role="button"
          >
            <div class="tmpl-card__info">
              <span class="tmpl-card__name">{{ tmpl.name }}</span>
              <span class="tmpl-card__meta">{{ tmpl.blocks.length || 0 }} блоков</span>
            </div>
            <p-tag
              *ngIf="tmpl.isDefault"
              value="По умолчанию"
              severity="info"
              styleClass="tmpl-card__tag"
            />
            <div class="tmpl-card__actions">
              <p-button
                icon="pi pi-trash"
                [rounded]="true"
                [text]="true"
                severity="danger"
                size="small"
                (click)="$event.stopPropagation(); deleteTemplate(tmpl)"
                pTooltip="Удалить шаблон"
              />
            </div>
          </div>

          <div *ngIf="templates().length === 0" class="tmpl-list__empty">
            <p>Нет сохранённых шаблонов</p>
          </div>
        </div>
      </div>
    </p-dialog>

    <!-- ═══ Text Block Editor Dialog ═══ -->
    <p-dialog
      [(visible)]="showTextEditor"
      [header]="'Редактировать текст'"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '500px', maxWidth: '90vw' }"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Заголовок</label>
          <input pInputText size="small" [(ngModel)]="editingTextBlock.title" class="w-full" placeholder="Необязательно" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Текст</label>
          <textarea
            pInputTextarea
            [(ngModel)]="editingTextBlock.content"
            rows="8"
            class="w-full"
            placeholder="Введите текст (каждая строка — новый абзац)"
          ></textarea>
          <span class="text-xs text-soft">Каждая строка = новый абзац</span>
        </div>
        <div class="flex gap-3">
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-xs font-medium">Размер шрифта</label>
            <p-select
              [(ngModel)]="editingTextBlock.settings.fontSize"
              [options]="fontSizes"
              optionLabel="label"
              optionValue="value"
              class="w-full"
              size="small"
            />
          </div>
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-xs font-medium">Выравнивание</label>
            <p-select
              [(ngModel)]="editingTextBlock.settings.align"
              [options]="alignOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
              size="small"
            />
          </div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Отмена" severity="secondary" [outlined]="true" size="small" (click)="showTextEditor = false" />
          <p-button label="Готово" size="small" (click)="confirmTextEdit()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ═══ Photo URL Dialog ═══ -->
    <p-dialog
      [(visible)]="showPhotoDialog"
      header="URL фото"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '400px', maxWidth: '90vw' }"
    >
      <div class="flex flex-col gap-3">
        <label class="text-sm font-medium">Введите URL изображения товара</label>
        <input pInputText size="small" [(ngModel)]="photoDialogUrl" class="w-full" placeholder="https://example.com/photo.jpg" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Отмена" severity="secondary" [outlined]="true" size="small" (click)="showPhotoDialog = false" />
          <p-button label="Применить" size="small" (click)="confirmPhoto()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ═══ Separator Padding Dialog ═══ -->
    <p-dialog
      [(visible)]="showPaddingDialog"
      header="Отступ разделителя"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '350px', maxWidth: '90vw' }"
    >
      <div class="flex flex-col gap-3">
        <label class="text-sm font-medium">Отступ сверху (px)</label>
        <p-inputNumber [(ngModel)]="paddingDialogValue" size="small" [min]="0" [max]="100" class="w-full" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Отмена" severity="secondary" [outlined]="true" size="small" (click)="showPaddingDialog = false" />
          <p-button label="Готово" size="small" (click)="confirmPadding()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ═══ Background URL Dialog ═══ -->
    <p-dialog
      [(visible)]="showBgDialog"
      header="Фоновое изображение"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '450px', maxWidth: '90vw' }"
    >
      <div class="flex flex-col gap-3">
        <label class="text-sm font-medium">Введите URL фонового изображения</label>
        <input pInputText size="small" [(ngModel)]="bgDialogUrl" class="w-full" placeholder="https://example.com/bg.jpg" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Отмена" severity="secondary" [outlined]="true" size="small" (click)="showBgDialog = false" />
          <p-button label="Применить" size="small" (click)="confirmBg()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ═══ Template Name Dialog ═══ -->
    <p-dialog
      [(visible)]="showTemplateNameDialog"
      header="Сохранение шаблона"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '400px', maxWidth: '90vw' }"
    >
      <div class="flex flex-col gap-3">
        <label class="text-sm font-medium">Название шаблона</label>
        <input pInputText size="small" [(ngModel)]="templateNameValue" class="w-full" placeholder="Мой шаблон" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Отмена" severity="secondary" [outlined]="true" size="small" (click)="showTemplateNameDialog = false" />
          <p-button label="Сохранить" size="small" (click)="confirmSaveTemplate()" />
        </div>
      </ng-template>
    </p-dialog>

    <p-toast position="top-right" />
  `,
  styleUrl: './quotation-editor.component.scss',
})
export class QuotationEditorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly crudApi = inject(CrudApiService);
  private readonly notification = inject(MessageService);

  // State
  readonly isNew = signal(false);
  readonly saving = signal(false);
  readonly quotation = signal<IQuotation>({
    number: '',
    counterpartyId: '',
    statusId: 'draft',
    total: 0,
    notes: '',
    items: [],
    templateId: '',
    date: new Date().toISOString(),
  });
  readonly items = signal<QuotationItem[]>([]);
  readonly blocks = signal<EditorBlock[]>([]);
  readonly templates = signal<DocumentTemplate[]>([]);
  readonly activeTemplateId = signal<string | undefined>(undefined);

  // UI State
  showTemplates = false;
  showAddMenu = false;
  showTextEditor = false;
  editingTextIndex = -1;
  editingTextBlock: EditorBlock = {
    type: 'text',
    order: 0,
    title: '',
    content: '',
    settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 },
  };

  // Computed
  readonly totalSum = computed(() =>
    this.items().reduce((acc, item) => acc + (item.qty || 0) * (item.price || 0), 0),
  );

  // ── Prompt-replacement dialog state ──
  showPhotoDialog = false;
  photoDialogIndex = -1;
  photoDialogUrl = '';

  showPaddingDialog = false;
  paddingDialogIndex = -1;
  paddingDialogValue = 4;

  showBgDialog = false;
  bgDialogUrl = '';

  showTemplateNameDialog = false;
  templateNameValue = '';

  // Font options
  readonly fontSizes = [
    { label: '9px', value: 9 },
    { label: '10px', value: 10 },
    { label: '11px', value: 11 },
    { label: '12px', value: 12 },
    { label: '14px', value: 14 },
    { label: '16px', value: 16 },
    { label: '18px', value: 18 },
    { label: '20px', value: 20 },
    { label: '24px', value: 24 },
  ];

  readonly alignOptions = [
    { label: 'Слева', value: 'left' },
    { label: 'По центру', value: 'center' },
    { label: 'Справа', value: 'right' },
  ];

  // Inline editing helpers for quotation
  get quotationDate(): string {
    const d = this.quotation().date;
    return d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  }
  set quotationDate(v: string) {
    this.quotation().date = v;
  }

  get quotationValidUntil(): string {
    const d = this.quotation().validUntil;
    return d || '';
  }
  set quotationValidUntil(v: string) {
    this.quotation().validUntil = v;
  }

  get quotationBg(): string | undefined {
    if (this.activeTemplateId()) {
      const tmpl = this.templates().find(t => t._id === this.activeTemplateId());
      return tmpl?.backgroundImage;
    }
    return undefined;
  }

  getBackgroundCss(): string {
    if (this.quotationBg) {
      return `url(${this.quotationBg})`;
    }
    return 'none';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new') {
      this.isNew.set(true);
      this.initNewQuotation();
    } else if (id) {
      this.loadQuotation(id);
    }

    this.loadTemplates();
  }

  // ===== Initialization =====
  private initNewQuotation(): void {
    this.quotation.set({
      ...this.quotation(),
      number: 'Новый',
      date: new Date().toISOString(),
      statusId: 'draft',
    });
  }

  private loadQuotation(id: string): void {
    this.crudApi.getById<IQuotation>('/directories/quotations', id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: (data) => {
            this.quotation.set(data);
            this.items.set(data.items || []);
            if (data.templateId) {
              this.activeTemplateId.set(data.templateId);
            } else {
              this.initDefaultBlocks();
            }
          },
          error: () => {
            this.notification.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить документ' });
            this.goBack();
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  private loadTemplates(): void {
    this.crudApi.list<DocumentTemplate>('/document-templates', { all: true })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: (res) => {
            this.templates.set(res.data || []);

            const activeId = this.activeTemplateId();

            // If we have an active template, apply its blocks on reload
            if (activeId && (res.data || []).length > 0) {
              const tmpl = res.data.find((t: DocumentTemplate) => t._id === activeId);
              if (tmpl && tmpl.blocks && tmpl.blocks.length > 0) {
                this.blocks.set(JSON.parse(JSON.stringify(tmpl.blocks)));
              } else {
                // Template not found or has no blocks — fall back to defaults
                this.initDefaultBlocks();
              }
              return;
            }

            // If no template loaded yet and we have templates, apply default
            if (!activeId && (res.data || []).length > 0) {
              const defaultTmpl = res.data.find((t: DocumentTemplate) => t.isDefault && t.docType === 'quotation');
              if (defaultTmpl) {
                this.applyTemplate(defaultTmpl);
              } else {
                this.initDefaultBlocks();
              }
            }
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  private initDefaultBlocks(): void {
    this.blocks.set(JSON.parse(JSON.stringify(DEFAULT_BLOCKS)));
  }

  // ===== Save =====
  save(): void {
    const q = this.quotation();
    const data = {
      ...q,
      items: this.items().map((item, i) => ({
        ...item,
        order: i,
        sum: (item.qty || 0) * (item.price || 0),
      })),
      templateId: this.activeTemplateId(),
      total: this.totalSum(),
    };

    this.saving.set(true);

    if (this.isNew()) {
      this.crudApi.create<IQuotation & { _id: string }>('/directories/quotations', data)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap({
            next: (result: IQuotation & { _id: string }) => {
              this.notification.add({ severity: 'success', summary: 'Создано', detail: 'КП успешно создано' });
              this.isNew.set(false);
              this.quotation.set({ ...this.quotation(), _id: result._id, number: result.number });
              this.router.navigate(['/quotations', result._id], { replaceUrl: true });
            },
            error: (err) => {
              this.notification.add({ severity: 'error', summary: 'Ошибка', detail: err.error?.error || 'Не удалось создать КП' });
            },
          }),
          finalize(() => this.saving.set(false)),
        )
        .subscribe();
    } else if (q._id) {
      this.crudApi.update('/directories/quotations', q._id, data)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap({
            next: () => {
              this.notification.add({ severity: 'success', summary: 'Сохранено', detail: 'Изменения сохранены' });
            },
            error: (err) => {
              this.notification.add({ severity: 'error', summary: 'Ошибка', detail: err.error?.error || 'Не удалось сохранить' });
            },
          }),
          finalize(() => this.saving.set(false)),
        )
        .subscribe();
    }
  }

  // ===== Items =====
  addItem(): void {
    this.items.update(items => [
      ...items,
      {
        sku: '',
        photo: undefined,
        name: '',
        qty: 1,
        unit: 'шт',
        price: 0,
        sum: 0,
        order: items.length,
      },
    ]);
  }

  removeItem(index: number): void {
    this.items.update(items => items.filter((_, i) => i !== index));
  }

  recalcItem(index: number): void {
    const item = this.items()[index];
    if (item) {
      item.sum = (item.qty || 0) * (item.price || 0);
    }
  }

  computeSum(item: QuotationItem): number {
    return (item.qty || 0) * (item.price || 0);
  }

  showPhotoInput(index: number): void {
    this.photoDialogIndex = index;
    this.photoDialogUrl = this.items()[index]?.photo || '';
    this.showPhotoDialog = true;
  }

  confirmPhoto(): void {
    if (this.photoDialogUrl && this.photoDialogIndex >= 0) {
      this.items.update(items => {
        const updated = [...items];
        updated[this.photoDialogIndex] = { ...updated[this.photoDialogIndex], photo: this.photoDialogUrl };
        return updated;
      });
    }
    this.showPhotoDialog = false;
    this.photoDialogIndex = -1;
  }

  trackByItem(index: number): number {
    return index;
  }

  // ===== Blocks =====
  addBlock(type: 'text' | 'separator'): void {
    this.showAddMenu = false;
    const newBlock: EditorBlock = {
      type,
      order: this.blocks().length,
      content: type === 'text' ? 'Новый текст...' : '',
      settings: {
        fontSize: type === 'text' ? 11 : 11,
        fontWeight: 'normal',
        align: 'left',
        paddingTop: 8,
        paddingBottom: 8,
      },
    };
    if (type === 'text') {
      newBlock.title = '';
    }
    this.blocks.update(blocks => [...blocks, newBlock]);
  }

  moveBlock(index: number, direction: -1 | 1): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.blocks().length) return;

    this.blocks.update(blocks => {
      const updated = [...blocks];
      const temp = updated[index];
      updated[index] = { ...updated[newIndex], order: index };
      updated[newIndex] = { ...temp, order: newIndex };
      return updated;
    });
  }

  removeBlock(index: number): void {
    this.blocks.update(blocks => blocks.filter((_, i) => i !== index));
  }

  editTextBlock(index: number): void {
    this.editingTextIndex = index;
    this.editingTextBlock = JSON.parse(JSON.stringify(this.blocks()[index]));
    this.showTextEditor = true;
  }

  confirmTextEdit(): void {
    if (this.editingTextIndex >= 0) {
      this.blocks.update(blocks => {
        const updated = [...blocks];
        updated[this.editingTextIndex] = { ...this.editingTextBlock };
        return updated;
      });
    }
    this.showTextEditor = false;
    this.editingTextIndex = -1;
  }

  editBlockSettings(index: number): void {
    const block = this.blocks()[index];
    if (block.type === 'separator') {
      this.paddingDialogIndex = index;
      this.paddingDialogValue = block.settings.paddingTop;
      this.showPaddingDialog = true;
    }
  }

  confirmPadding(): void {
    if (this.paddingDialogIndex >= 0) {
      this.blocks.update(blocks => {
        const updated = [...blocks];
        updated[this.paddingDialogIndex] = {
          ...updated[this.paddingDialogIndex],
          settings: { ...updated[this.paddingDialogIndex].settings, paddingTop: this.paddingDialogValue },
        };
        return updated;
      });
    }
    this.showPaddingDialog = false;
    this.paddingDialogIndex = -1;
  }

  trackByBlock(index: number, _block: EditorBlock): string {
    return `${_block.type}-${index}`;
  }

  // ===== Background =====
  showBgInput(): void {
    this.bgDialogUrl = this.quotationBg || '';
    this.showBgDialog = true;
  }

  confirmBg(): void {
    const url = this.bgDialogUrl;
    if (!url) {
      this.showBgDialog = false;
      return;
    }

    const activeId = this.activeTemplateId();
    if (activeId) {
      this.crudApi.update('/document-templates', activeId, { backgroundImage: url })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => this.loadTemplates()),
        )
        .subscribe();
    } else {
      this.crudApi.create<DocumentTemplate>('/document-templates', {
        name: 'Фон для КП',
        docType: 'quotation',
        isDefault: false,
        backgroundImage: url,
        blocks: this.blocks(),
      }).pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((result: DocumentTemplate) => {
          this.activeTemplateId.set(result._id);
          this.loadTemplates();
        }),
      ).subscribe();
    }
    this.showBgDialog = false;
  }

  removeBackgroundImage(): void {
    const activeId = this.activeTemplateId();
    if (activeId) {
      this.crudApi.update('/document-templates', activeId, { backgroundImage: undefined })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => this.loadTemplates()),
        )
        .subscribe();
    }
  }

  // ===== Templates =====
  applyTemplate(tmpl: DocumentTemplate): void {
    this.activeTemplateId.set(tmpl._id);
    if (tmpl.blocks && tmpl.blocks.length > 0) {
      this.blocks.set(JSON.parse(JSON.stringify(tmpl.blocks)));
    } else {
      this.initDefaultBlocks();
    }
    this.showTemplates = false;
  }

  showSaveTemplateInput(): void {
    this.templateNameValue = '';
    this.showTemplateNameDialog = true;
  }

  confirmSaveTemplate(): void {
    const name = this.templateNameValue;
    if (!name) {
      this.showTemplateNameDialog = false;
      return;
    }

    const template: Partial<DocumentTemplate> & { name: string } = {
      name,
      docType: 'quotation',
      isDefault: false,
      blocks: this.blocks(),
      backgroundImage: this.quotationBg,
    };

    this.crudApi.create<DocumentTemplate>('/document-templates', template)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: (result: DocumentTemplate) => {
            this.notification.add({ severity: 'success', summary: 'Шаблон сохранён', detail: `Шаблон «${name}» создан` });
            this.loadTemplates();
            this.activeTemplateId.set(result._id);
          },
          error: () => {
            this.notification.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось сохранить шаблон' });
          },
        }),
      )
      .subscribe();
    this.showTemplateNameDialog = false;
  }

  deleteTemplate(tmpl: DocumentTemplate): void {
    if (!tmpl._id) return;
    this.crudApi.delete('/document-templates', tmpl._id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: () => {
            this.notification.add({ severity: 'success', summary: 'Удалено', detail: 'Шаблон удалён' });
            if (this.activeTemplateId() === tmpl._id) {
              this.activeTemplateId.set(undefined);
              this.initDefaultBlocks();
            }
            this.loadTemplates();
          },
        }),
      )
      .subscribe();
  }

  trackByTemplate(index: number, tmpl: DocumentTemplate): string | undefined {
    return tmpl._id || String(index);
  }

  // ===== Navigation =====
  goBack(): void {
    this.router.navigate(['/quotations']);
  }

  // ===== Utilities =====
  getSeverity(value: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast'> = {
      draft: 'warn', approved: 'success', sent: 'info', cancelled: 'danger',
      completed: 'success', in_progress: 'info',
    };
    return map[value] ?? 'info';
  }
}
