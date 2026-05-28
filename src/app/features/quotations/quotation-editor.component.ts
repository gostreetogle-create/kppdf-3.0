import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgFor, NgIf, DecimalPipe, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, tap, catchError, finalize } from 'rxjs';

import type { IQuotation, IProduct } from '../../../../shared/types';

// PrimeNG button — только для block-controls (toggle-панель); остальное через app-kp-button
/* eslint-disable no-restricted-imports */
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
/* eslint-enable no-restricted-imports */
import { MessageService } from 'primeng/api';

// Services
import { CrudApiService } from '../../shared/services/crud-api.service';
import {
  KpSortableListDirective,
  KpSortableItemDirective,
  KpSortableHandleDirective,
  KpSplitTextCardComponent,
  KpProductPickerComponent,
  KpButtonComponent,
  moveSortableItems,
} from '../../shared/ui';
import type { KpSortableDropEvent } from '../../shared/ui';

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

interface EditorBlockCell {
  content: string;
  align?: 'left' | 'center' | 'right';
}

interface EditorBlock {
  _id?: string;
  clientKey?: string;
  type: 'text' | 'table' | 'header' | 'separator';
  order: number;
  title?: string;
  content: string;
  tableKind?: QuotationTableKind;
  cells?: EditorBlockCell[];
  settings: {
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'semibold';
    align: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    borderStyle?: 'none' | 'dashed' | 'solid';
    paddingTop: number;
    paddingBottom: number;
    columns?: number;
  };
}

const BLOCK_TEXT_COLORS = [
  { value: '', label: 'Авто' },
  { value: '#111827', label: 'Чёрный' },
  { value: '#2563eb', label: 'Синий' },
  { value: '#dc2626', label: 'Красный' },
  { value: '#059669', label: 'Зелёный' },
] as const;

interface DocumentTemplate {
  _id?: string;
  name: string;
  organizationId?: string;
  docType: string;
  isDefault: boolean;
  backgroundImage?: string;
  blocks: EditorBlock[];
}

interface RowActionState {
  index: number;
}

/** Типы таблиц в редакторе КП (расширяется через настройки приложения — см. backlog). */
type QuotationTableKind = 'products';

interface QuotationTableBlockOption {
  kind: QuotationTableKind;
  label: string;
  title: string;
}

const QUOTATION_TABLE_BLOCK_OPTIONS: QuotationTableBlockOption[] = [
  { kind: 'products', label: 'Товары', title: 'Товары' },
];

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
    content: '',
    cells: [
      { content: 'Поставщик: [Название организации]\nИНН: [ИНН]\nАдрес: [Адрес]', align: 'center' },
      { content: 'Клиент: [Название клиента]', align: 'center' },
    ],
    settings: { fontSize: 11, fontWeight: 'normal', align: 'center', paddingTop: 8, paddingBottom: 8, columns: 2 },
  },
  {
    type: 'table',
    order: 2,
    title: 'Товары',
    tableKind: 'products',
    content: '',
    settings: { fontSize: 10, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 },
  },
  {
    type: 'text',
    order: 3,
    title: 'Условия',
    content: 'Условия оплаты: предоплата 100%\nСрок поставки: [количество] рабочих дней\nГарантия: [срок]',
    settings: { fontSize: 10, fontWeight: 'normal', align: 'center', paddingTop: 8, paddingBottom: 8 },
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
    NgFor, NgIf, DecimalPipe, NgStyle, FormsModule,
    ButtonModule, InputTextModule, InputNumberModule, SelectModule, TextareaModule,
    ToastModule, DialogModule, TagModule,
    KpSortableListDirective, KpSortableItemDirective, KpSortableHandleDirective,
    KpSplitTextCardComponent,
    KpProductPickerComponent,
    KpButtonComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="editor">
      <!-- ═══ Top Toolbar ═══ -->
      <header class="editor__toolbar">
        <div class="editor__toolbar-left">
          <app-kp-button
            icon="pi pi-arrow-left"
            severity="secondary"
            [text]="true"
            size="small"
            (buttonClick)="goBack()"
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
          <app-kp-button
            [icon]="blocksReorderLocked() ? 'pi pi-lock' : 'pi pi-lock-open'"
            [label]="blocksReorderLocked() ? 'Порядок зафиксирован' : 'Порядок открыт'"
            [severity]="blocksReorderLocked() ? 'secondary' : 'primary'"
            [outlined]="blocksReorderLocked()"
            size="small"
            (buttonClick)="toggleBlocksReorderLock()"
            [attr.aria-label]="blocksReorderLocked() ? 'Разблокировать перемещение блоков' : 'Зафиксировать порядок блоков'"
            [attr.aria-pressed]="blocksReorderLocked()"
          />
          <app-kp-button
            label="Шаблоны"
            icon="pi pi-palette"
            severity="secondary"
            [outlined]="true"
            size="small"
            (buttonClick)="showTemplates = true"
          />
          <app-kp-button
            label="Сохранить"
            icon="pi pi-check"
            size="small"
            (buttonClick)="save()"
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
            [class.editor__canvas--reorder-locked]="blocksReorderLocked()"
            [style.background-image]="getBackgroundCss()"
          >
            <!-- Blocks -->
            <div
              class="editor__blocks"
              appKpSortableList
              [appKpSortableListData]="blocks()"
              [appKpSortableListDisabled]="blocksReorderLocked()"
              (appKpSortableListDropped)="onBlockDropped($event)"
            >
              <div
                *ngFor="let block of blocks(); trackBy: trackByBlock; let i = index"
                appKpSortableItem
                [appKpSortableItemData]="block"
                [appKpSortableItemDisabled]="blocksReorderLocked()"
                [appKpSortableLockAxis]="'y'"
                class="editor__block"
                [class.editor__block--table]="block.type === 'table'"
                [class.editor__block--header]="block.type === 'header'"
                [class.editor__block--separator]="block.type === 'separator'"
                [class.editor__block--reorder-locked]="blocksReorderLocked()"
                [class.editor__block--controls-active]="isBlockControlsVisible(i, block)"
                [class.editor__block--has-controls]="hasEditableControls(block)"
                (appKpSortableItemStarted)="onBlockDragStarted(i)"
                (appKpSortableItemEnded)="onBlockDragEnded()"
              >
                <!-- Block Controls (hover) — широкая панель навигации -->
                <div class="editor__block-controls" role="toolbar" [attr.aria-label]="'Настройки блока ' + (i + 1)">
                  @if (block.type === 'text' || block.type === 'header') {
                    <div class="editor__block-controls-section">
                      <span class="editor__block-controls-label">Выравнивание</span>
                      <div class="editor__block-controls-align" role="group" aria-label="Выравнивание блока">
                        <p-button
                          icon="pi pi-align-left"
                          [rounded]="false"
                          [outlined]="block.settings.align !== 'left'"
                          [severity]="block.settings.align === 'left' ? 'primary' : 'secondary'"
                          size="small"
                          styleClass="editor__block-controls-chip"
                          (click)="setBlockAlign(i, 'left')"
                        />
                        <p-button
                          icon="pi pi-align-center"
                          [rounded]="false"
                          [outlined]="block.settings.align !== 'center'"
                          [severity]="block.settings.align === 'center' ? 'primary' : 'secondary'"
                          size="small"
                          styleClass="editor__block-controls-chip"
                          (click)="setBlockAlign(i, 'center')"
                        />
                        <p-button
                          icon="pi pi-align-right"
                          [rounded]="false"
                          [outlined]="block.settings.align !== 'right'"
                          [severity]="block.settings.align === 'right' ? 'primary' : 'secondary'"
                          size="small"
                          styleClass="editor__block-controls-chip"
                          (click)="setBlockAlign(i, 'right')"
                        />
                      </div>
                    </div>
                    <div class="editor__block-controls-section">
                      <span class="editor__block-controls-label">Цвет текста</span>
                      <div class="editor__block-controls-colors" role="group" aria-label="Цвет текста">
                        @for (c of blockTextColors; track c.value) {
                          <button
                            type="button"
                            class="editor__color-swatch"
                            [class.editor__color-swatch--active]="blockColorActive(block, c.value)"
                            [class.editor__color-swatch--auto]="!c.value"
                            [style.background]="c.value || null"
                            [attr.aria-label]="c.label"
                            [attr.aria-pressed]="blockColorActive(block, c.value)"
                            (click)="setBlockColor(i, c.value)"
                          ></button>
                        }
                      </div>
                    </div>
                    <div class="editor__block-controls-row">
                      <p-button
                        icon="pi pi-bold"
                        [rounded]="false"
                        [outlined]="block.settings.fontWeight !== 'bold'"
                        [severity]="block.settings.fontWeight === 'bold' ? 'primary' : 'secondary'"
                        size="small"
                        (click)="toggleBlockFontWeight(i)"
                        styleClass="editor__block-controls-btn--wide"
                      />
                      <p-button
                        icon="pi pi-stop"
                        [rounded]="false"
                        [outlined]="!blockBorderActive(block)"
                        [severity]="blockBorderActive(block) ? 'primary' : 'secondary'"
                        size="small"
                        (click)="cycleBlockBorder(i)"
                        styleClass="editor__block-controls-btn--wide"
                      />
                    </div>
                  }

                  @if (block.type === 'text') {
                    <div class="editor__block-controls-row">
                      <p-button
                        icon="pi pi-plus"
                        [rounded]="false"
                        [outlined]="true"
                        severity="secondary"
                        size="small"
                        (click)="onAddCell(i)"
                        [disabled]="getCells(block).length >= maxTextCells"
                        styleClass="editor__block-controls-btn--wide"
                      />
                      <p-button
                        icon="pi pi-pencil"
                        [rounded]="false"
                        [outlined]="true"
                        severity="secondary"
                        size="small"
                        (click)="editTextBlock(i)"
                        styleClass="editor__block-controls-btn--wide"
                      />
                    </div>
                  }

                  @if (block.type === 'separator') {
                    <p-button
                      icon="pi pi-arrows-v"
                      [rounded]="false"
                      [outlined]="true"
                      severity="secondary"
                      size="small"
                      (click)="editBlockSettings(i)"
                      styleClass="editor__block-controls-btn--wide"
                    />
                  }

                  <div class="editor__block-controls-row editor__block-controls-row--full">
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="false"
                      [outlined]="true"
                      severity="danger"
                      size="small"
                      (click)="removeBlock(i)"
                      [disabled]="blocks().length <= 1"
                      styleClass="editor__block-controls-btn--wide"
                    />
                  </div>
                </div>

                <!-- Block Content -->
                <!-- Header -->
                <div
                  *ngIf="block.type === 'header'"
                  class="editor__block-content editor__block-drag-surface"
                  [class.editor__block-drag-surface--active]="!blocksReorderLocked()"
                  appKpSortableHandle
                  [ngStyle]="blockVisualStyles(block)"
                  [style.text-align]="block.settings.align"
                  [style.font-size.px]="block.settings.fontSize"
                  [style.font-weight]="block.settings.fontWeight"
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                  (mouseenter)="setActiveBlock(i)"
                  (mouseleave)="clearActiveBlock(i)"
                  (focusin)="setActiveBlock(i)"
                  (focusout)="clearActiveBlock(i)"
                >
                  <div [innerHTML]="block.content"></div>
                </div>

                <!-- Text Card -->
                <div
                  *ngIf="block.type === 'text'"
                  class="editor__block-content editor__text-card editor__block-drag-surface"
                  [class.editor__block-drag-surface--active]="!blocksReorderLocked()"
                  appKpSortableHandle
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                  (mouseenter)="setActiveBlock(i)"
                  (mouseleave)="clearActiveBlock(i)"
                  (focusin)="setActiveBlock(i)"
                  (focusout)="clearActiveBlock(i)"
                >
                  <app-kp-split-text-card
                    [title]="block.title ?? ''"
                    [cells]="getCells(block)"
                    [settings]="block.settings"
                    [maxColumns]="maxTextCells"
                    (editCell)="onEditCell(i, $event)"
                  />
                </div>

                <!-- Separator -->
                <div
                  *ngIf="block.type === 'separator'"
                  class="editor__block-content editor__block-drag-surface"
                  [class.editor__block-drag-surface--active]="!blocksReorderLocked()"
                  appKpSortableHandle
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                  (mouseenter)="setActiveBlock(i)"
                  (mouseleave)="clearActiveBlock(i)"
                  (focusin)="setActiveBlock(i)"
                  (focusout)="clearActiveBlock(i)"
                >
                  <hr class="editor__separator" />
                </div>

                <!-- Table Block -->
                <div
                  *ngIf="block.type === 'table'"
                  class="editor__table-wrapper editor__block-drag-surface"
                  [class.editor__block-drag-surface--active]="!blocksReorderLocked()"
                  (mouseenter)="setActiveBlock(i)"
                  (mouseleave)="clearActiveBlock(i)"
                  (focusin)="setActiveBlock(i)"
                  (focusout)="clearActiveBlock(i)"
                >
                  <div class="editor__table-toolbar">
                    <div class="editor__table-toolbar-left">
                      <button
                        type="button"
                        class="editor__table-drag-handle"
                        appKpSortableHandle
                        [disabled]="blocksReorderLocked()"
                        [attr.aria-label]="'Переместить блок таблицы ' + (i + 1)"
                        title="Перетащить блок таблицы"
                      >
                        <i class="pi pi-grip-vertical" aria-hidden="true"></i>
                      </button>
                      <span class="editor__table-title">{{ block.title || 'Таблица' }}</span>
                    </div>
                    <div class="editor__table-toolbar-actions">
                      <app-kp-button
                        icon="pi pi-shopping-cart"
                        size="small"
                        [rounded]="true"
                        [text]="true"
                        [attr.aria-label]="'Выбрать товары'"
                        [attr.title]="'Выбрать товары'"
                        (buttonClick)="openProductPicker()"
                      />
                    </div>
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
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        *ngFor="let item of items(); trackBy: trackByItem; let i = index"
                        class="editor__table-row"
                        [class.editor__table-row--selected]="selectedItemIndex() === i"
                        (click)="onTableRowClick($event, i)"
                      >
                        <td class="editor__table-idx">
                          <button type="button" class="editor__table-cell-action" (click)="openRowActions(i)">
                            {{ i + 1 }}
                          </button>
                        </td>
                        <td>
                          <button type="button" class="editor__table-cell-action" (click)="openRowActions(i)">
                            {{ item.sku || '—' }}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            class="editor__table-photo"
                            (click)="openRowActions(i)"
                            [attr.aria-label]="'Действия для товара ' + (i + 1)"
                          >
                            <i class="pi pi-image" *ngIf="!item.photo"></i>
                            <img *ngIf="item.photo" [src]="item.photo" class="editor__table-photo-img" alt="фото" />
                          </button>
                        </td>
                        <td>
                          <button type="button" class="editor__table-cell-action editor__table-cell-action--wide" (click)="openRowActions(i)">
                            {{ item.name || 'Без названия' }}
                          </button>
                        </td>
                        <td>
                          <p-inputNumber
                            [(ngModel)]="item.qty"
                            size="small"
                            class="editor__table-number"
                            [min]="0"
                            (onValueChange)="recalcItem(i)"
                            (dblclick)="$event.stopPropagation()"
                          />
                        </td>
                        <td>
                          <span class="editor__table-readonly">{{ item.unit || 'шт' }}</span>
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
                            (dblclick)="$event.stopPropagation()"
                          />
                        </td>
                        <td class="editor__table-sum">
                          {{ computeSum(item) | number:'1.2-2' }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="7" class="editor__table-total-label">Итого:</td>
                        <td class="editor__table-total">{{ totalSum() | number:'1.2-2' }}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <!-- Add Block FAB -->
            <div class="editor__add-fab">
              <app-kp-button
                icon="pi pi-plus"
                [rounded]="true"
                severity="primary"
                (buttonClick)="showAddMenu = !showAddMenu"
              />
              <div class="editor__add-menu" *ngIf="showAddMenu" (keydown.escape)="showAddMenu = false" tabindex="-1" role="menu">
                <app-kp-button label="Текстовый блок" icon="pi pi-align-left" [text]="true" size="small" (buttonClick)="addBlock('text')" />
                <app-kp-button label="Разделитель" icon="pi pi-minus" [text]="true" size="small" (buttonClick)="addBlock('separator')" />
                <div class="editor__add-menu-table" role="presentation" (buttonClick)="$event.stopPropagation()">
                  <span class="editor__add-menu-label">Таблица</span>
                  <p-select
                    [(ngModel)]="selectedTableKind"
                    [options]="tableBlockOptions"
                    optionLabel="label"
                    optionValue="kind"
                    class="w-full"
                    size="small"
                    appendTo="body"
                  />
                  <app-kp-button
                    label="Добавить таблицу"
                    icon="pi pi-table"
                    [text]="true"
                    size="small"
                    class="w-full"
                    (buttonClick)="addTableBlock()"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Side info panel -->
        <aside class="editor__sidebar">
          <div class="editor__sidebar-section">
            <h3 class="editor__sidebar-title">Реквизиты</h3>
            <div class="editor__sidebar-field">
              <label for="qe-field-number">Номер</label>
              <input id="qe-field-number" pInputText size="small" [(ngModel)]="quotation().number" readonly class="w-full" />
            </div>
            <div class="editor__sidebar-field">
              <label for="qe-field-date">Дата</label>
              <input id="qe-field-date" pInputText size="small" [(ngModel)]="quotationDate" class="w-full" />
            </div>
            <div class="editor__sidebar-field">
              <label for="qe-field-counterparty">Контрагент</label>
              <input id="qe-field-counterparty" pInputText size="small" [(ngModel)]="quotation().counterpartyId" class="w-full" placeholder="ID контрагента" />
            </div>
            <div class="editor__sidebar-field">
              <label for="qe-field-valid-until">Действует до</label>
              <input id="qe-field-valid-until" pInputText size="small" [(ngModel)]="quotationValidUntil" class="w-full" />
            </div>
          </div>

          <div class="editor__sidebar-section">
            <h3 class="editor__sidebar-title">Фон документа</h3>
            <div class="editor__sidebar-field">
              <app-kp-button
                [label]="quotationBg ? 'Изменить фон' : 'Загрузить фон'"
                icon="pi pi-image"
                severity="secondary"
                [outlined]="true"
                size="small"
                (buttonClick)="showBgInput()"
                class="w-full"
              />
              <app-kp-button
                *ngIf="quotationBg"
                label="Удалить фон"
                icon="pi pi-times"
                severity="danger"
                [text]="true"
                size="small"
                (buttonClick)="removeBackgroundImage()"
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

          @if (items().length > 0) {
            <div class="editor__sidebar-section">
              <h3 class="editor__sidebar-title">Товары</h3>
              <ul class="editor__item-nav" role="list">
                @for (item of items(); track $index; let i = $index) {
                  <li class="editor__item-nav-item" role="listitem">
                    <button
                      type="button"
                      class="editor__item-nav-btn"
                      [class.editor__item-nav-btn--active]="selectedItemIndex() === i"
                      (click)="selectItem(i)"
                    >
                      <span class="editor__item-nav-idx">{{ i + 1 }}</span>
                      @if (item.photo) {
                        <img [src]="item.photo" alt="" class="editor__item-nav-thumb" />
                      } @else {
                        <span class="editor__item-nav-thumb editor__item-nav-thumb--empty" aria-hidden="true">
                          <i class="pi pi-image"></i>
                        </span>
                      }
                      <span class="editor__item-nav-text">
                        <span class="editor__item-nav-name">{{ item.name || 'Без названия' }}</span>
                        <span class="editor__item-nav-meta">
                          {{ item.qty || 0 }} {{ item.unit || 'шт' }} · {{ computeSum(item) | number:'1.2-2' }} ₽
                        </span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            </div>

            @if (selectedItemIndex() !== null) {
              @if (items()[selectedItemIndex()!]; as item) {
                <div class="editor__sidebar-section editor__item-editor">
                  <h3 class="editor__sidebar-title">Позиция {{ selectedItemIndex()! + 1 }}</h3>

                  <div class="editor__item-photo-panel">
                    @if (item.photo) {
                      <button
                        type="button"
                        class="editor__item-photo-zoom"
                        (click)="openPhotoZoom(item.photo!)"
                        aria-label="Увеличить фото товара"
                      >
                        <img [src]="item.photo" alt="Фото товара" />
                        <span class="editor__item-photo-zoom-hint">
                          <i class="pi pi-search-plus" aria-hidden="true"></i>
                          Увеличить
                        </span>
                      </button>
                    } @else {
                      <div class="editor__item-photo-empty">
                        <i class="pi pi-image" aria-hidden="true"></i>
                        <span>Фото не задано</span>
                      </div>
                    }
                    <app-kp-button
                      label="Изменить фото"
                      icon="pi pi-image"
                      severity="secondary"
                      [outlined]="true"
                      size="small"
                      styleClass="w-full"
                      (buttonClick)="showPhotoInput(selectedItemIndex()!)"
                    />
                  </div>

                  <div class="editor__item-editor-actions">
                    <app-kp-button
                      label="Заменить"
                      icon="pi pi-refresh"
                      severity="secondary"
                      [outlined]="true"
                      size="small"
                      styleClass="editor__item-editor-action"
                      (buttonClick)="replaceItem(selectedItemIndex()!)"
                    />
                    <app-kp-button
                      label="Удалить"
                      icon="pi pi-trash"
                      severity="danger"
                      [outlined]="true"
                      size="small"
                      styleClass="editor__item-editor-action"
                      (buttonClick)="removeItem(selectedItemIndex()!)"
                    />
                  </div>
                </div>
              }
            }
          }
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
          <app-kp-button
            label="Сохранить как шаблон"
            icon="pi pi-save"
            size="small"
            (buttonClick)="showSaveTemplateInput()"
            [outlined]="true"
          />
        </div>

        <div class="tmpl-list__items">
          <div
            *ngFor="let tmpl of templates(); trackBy: trackByTemplate"
            class="tmpl-card"
            [class.tmpl-card--active]="activeTemplateId() === tmpl._id"
            (buttonClick)="applyTemplate(tmpl)" (keydown.enter)="applyTemplate(tmpl)" tabindex="0" role="button"
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
              <app-kp-button
                icon="pi pi-trash"
                [rounded]="true"
                [text]="true"
                severity="danger"
                size="small"
                (buttonClick)="$event.stopPropagation(); deleteTemplate(tmpl)"
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
      [header]="'Настройки текстового блока'"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '500px', maxWidth: '90vw' }"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label for="qe-text-block-title" class="text-sm font-medium">Заголовок</label>
          <input id="qe-text-block-title" pInputText size="small" [(ngModel)]="editingTextBlock.title" class="w-full" placeholder="Необязательно" />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">Колонки</span>
          <div class="flex flex-col gap-2">
            <div
              *ngFor="let cell of editingTextBlock.cells; let ci = index"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-soft flex-1 truncate">{{ cell.content || '(пусто)' }}</span>
              <app-kp-button
                icon="pi pi-pencil"
                [rounded]="true"
                [text]="true"
                severity="secondary"
                size="small"
                (buttonClick)="openCellEditor(ci)"
              />
              <app-kp-button
                icon="pi pi-trash"
                [rounded]="true"
                [text]="true"
                severity="danger"
                size="small"
                (buttonClick)="deleteCell(ci)"
                [disabled]="(editingTextBlock.cells?.length ?? 0) <= 1"
              />
            </div>
          </div>
          <app-kp-button
            label="Добавить колонку"
            icon="pi pi-plus"
            [text]="true"
            size="small"
            (buttonClick)="addCell()"
            [disabled]="(editingTextBlock.cells?.length ?? 0) >= maxTextCells"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="qe-text-block-font-size" class="text-xs font-medium">Размер шрифта</label>
          <p-select
            inputId="qe-text-block-font-size"
            [(ngModel)]="editingTextBlock.settings.fontSize"
            [options]="fontSizes"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            size="small"
          />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showTextEditor = false" />
          <app-kp-button label="Готово" size="small" (buttonClick)="confirmTextEdit()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ═══ Text Cell Dialog ═══ -->
    <p-dialog
      [(visible)]="showCellEditor"
      [header]="'Редактировать колонку'"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '500px', maxWidth: '90vw' }"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label for="qe-cell-content" class="text-sm font-medium">Текст колонки</label>
          <textarea
            id="qe-cell-content"
            pInputTextarea
            [(ngModel)]="editingCellContent"
            rows="8"
            class="w-full"
            placeholder="Введите текст (каждая строка — новый абзац)"
          ></textarea>
          <span class="text-xs text-soft">Каждая строка = новый абзац</span>
        </div>
        <div class="flex flex-col gap-1">
          <span id="qe-cell-align-label" class="text-xs font-medium">Выравнивание колонки</span>
          <div class="editor__align-group" role="group" aria-labelledby="qe-cell-align-label">
            <app-kp-button
              icon="pi pi-align-left"
              [rounded]="false"
              [text]="editingCellAlign !== 'left'"
              [severity]="editingCellAlign === 'left' ? 'primary' : 'secondary'"
              size="small"
              (buttonClick)="editingCellAlign = 'left'"
            />
            <app-kp-button
              icon="pi pi-align-center"
              [rounded]="false"
              [text]="editingCellAlign !== 'center'"
              [severity]="editingCellAlign === 'center' ? 'primary' : 'secondary'"
              size="small"
              (buttonClick)="editingCellAlign = 'center'"
            />
            <app-kp-button
              icon="pi pi-align-right"
              [rounded]="false"
              [text]="editingCellAlign !== 'right'"
              [severity]="editingCellAlign === 'right' ? 'primary' : 'secondary'"
              size="small"
              (buttonClick)="editingCellAlign = 'right'"
            />
          </div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showCellEditor = false" />
          <app-kp-button label="Готово" size="small" (buttonClick)="confirmCellEdit()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ═══ Photo Zoom Dialog ═══ -->
    <p-dialog
      [(visible)]="showPhotoZoomDialog"
      header="Фото товара"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: 'auto', maxWidth: '95vw' }"
      styleClass="editor__photo-zoom-dialog"
    >
      <img [src]="photoZoomUrl" class="editor__photo-zoom-img" alt="Увеличенное фото товара" />
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <app-kp-button label="Закрыть" severity="secondary" [outlined]="true" size="small" (buttonClick)="showPhotoZoomDialog = false" />
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
        <label for="qe-photo-url" class="text-sm font-medium">Введите URL изображения товара</label>
        <input id="qe-photo-url" pInputText size="small" [(ngModel)]="photoDialogUrl" class="w-full" placeholder="https://example.com/photo.jpg" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showPhotoDialog = false" />
          <app-kp-button label="Применить" size="small" (buttonClick)="confirmPhoto()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ═══ Row Actions Dialog ═══ -->
    <p-dialog
      [(visible)]="showRowActionsDialog"
      header="Действия с товарной позицией"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '420px', maxWidth: '90vw' }"
    >
      <div class="editor__row-actions">
        @if (rowActionState(); as state) {
          <div class="editor__row-actions-summary">
            Позиция {{ state.index + 1 }}: {{ items()[state.index]?.name || 'Без названия' }}
          </div>
          <div class="editor__row-actions-buttons">
            <app-kp-button
              label="Заменить товар"
              icon="pi pi-refresh"
              severity="secondary"
              [outlined]="true"
              size="small"
              styleClass="w-full"
              (buttonClick)="replaceItemFromActions()"
            />
            <app-kp-button
              label="Редактировать товар"
              icon="pi pi-pencil"
              severity="secondary"
              [outlined]="true"
              size="small"
              styleClass="w-full"
              (buttonClick)="editProductFromActions()"
            />
            <app-kp-button
              label="Удалить позицию"
              icon="pi pi-trash"
              severity="danger"
              [outlined]="true"
              size="small"
              styleClass="w-full"
              (buttonClick)="removeItemFromActions()"
            />
            <app-kp-button
              label="Отмена"
              severity="secondary"
              [outlined]="true"
              size="small"
              styleClass="w-full"
              (buttonClick)="closeRowActionsDialog()"
            />
          </div>
        }
      </div>
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
        <label for="qe-padding-value" class="text-sm font-medium">Отступ сверху (px)</label>
        <p-inputNumber inputId="qe-padding-value" [(ngModel)]="paddingDialogValue" size="small" [min]="0" [max]="100" class="w-full" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showPaddingDialog = false" />
          <app-kp-button label="Готово" size="small" (buttonClick)="confirmPadding()" />
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
        <label for="qe-bg-url" class="text-sm font-medium">Введите URL фонового изображения</label>
        <input id="qe-bg-url" pInputText size="small" [(ngModel)]="bgDialogUrl" class="w-full" placeholder="https://example.com/bg.jpg" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showBgDialog = false" />
          <app-kp-button label="Применить" size="small" (buttonClick)="confirmBg()" />
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
        <label for="qe-template-name" class="text-sm font-medium">Название шаблона</label>
        <input id="qe-template-name" pInputText size="small" [(ngModel)]="templateNameValue" class="w-full" placeholder="Мой шаблон" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showTemplateNameDialog = false" />
          <app-kp-button label="Сохранить" size="small" (buttonClick)="confirmSaveTemplate()" />
        </div>
      </ng-template>
    </p-dialog>

    <app-kp-product-picker
      [(visible)]="productPickerVisible"
      [multiple]="replaceItemIndex() === null"
      [pickerTitle]="replaceItemIndex() === null ? 'Выберите товары' : 'Заменить товар'"
      [selectedIds]="existingProductIds()"
      (productsSelected)="onProductsSelected($event)"
      (productSelected)="onProductReplaced($event)"
    />

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
  selectedTableKind: QuotationTableKind = 'products';
  readonly tableBlockOptions = QUOTATION_TABLE_BLOCK_OPTIONS;
  showTextEditor = false;
  showCellEditor = false;
  editingTextIndex = -1;
  editingCellIndex = -1;
  editingCellContent = '';
  editingCellAlign: 'left' | 'center' | 'right' = 'center';
  readonly maxTextCells = 6;
  readonly blockTextColors = BLOCK_TEXT_COLORS;
  editingTextBlock: EditorBlock = {
    type: 'text',
    order: 0,
    title: '',
    content: '',
    cells: [{ content: '' }],
    settings: { fontSize: 11, fontWeight: 'normal', align: 'center', paddingTop: 8, paddingBottom: 8 },
  };

  // Computed
  readonly totalSum = computed(() =>
    this.items().reduce((acc, item) => acc + (item.qty || 0) * (item.price || 0), 0),
  );

  readonly productPickerVisible = signal(false);
  readonly replaceItemIndex = signal<number | null>(null);
  readonly selectedItemIndex = signal<number | null>(null);
  readonly activeBlockIndex = signal<number | null>(null);
  readonly isDraggingBlock = signal(false);
  readonly rowActionState = signal<RowActionState | null>(null);
  showRowActionsDialog = false;

  /** true = порядок блоков зафиксирован, перетаскивание отключено */
  readonly blocksReorderLocked = signal(false);

  readonly existingProductIds = computed(() =>
    this.items().map((i) => i.productId).filter((id): id is string => !!id),
  );

  // ── Prompt-replacement dialog state ──
  showPhotoDialog = false;
  photoDialogIndex = -1;
  photoDialogUrl = '';

  showPhotoZoomDialog = false;
  photoZoomUrl = '';

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
                this.blocks.set(this.normalizeBlocks(JSON.parse(JSON.stringify(tmpl.blocks))));
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
    this.blocks.set(this.normalizeBlocks(JSON.parse(JSON.stringify(DEFAULT_BLOCKS))));
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
  openProductPicker(): void {
    this.replaceItemIndex.set(null);
    this.productPickerVisible.set(true);
  }

  onTableRowDblclick(event: MouseEvent, index: number): void {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.closest('input, select, .p-inputnumber, .p-select, .p-inputtext')
    ) {
      return;
    }
    this.replaceItemIndex.set(index);
    this.productPickerVisible.set(true);
  }

  onTableRowClick(event: MouseEvent, index: number): void {
    const target = event.target as HTMLElement;
    if (target.closest('input, select, .p-inputnumber, .p-select, .p-inputtext, .editor__table-photo')) {
      return;
    }
    this.selectItem(index);
  }

  onTablePhotoClick(event: Event, index: number): void {
    event.stopPropagation();
    this.selectItem(index);
    this.showPhotoInput(index);
  }

  openRowActions(index: number): void {
    this.selectItem(index);
    this.rowActionState.set({ index });
    this.showRowActionsDialog = true;
  }

  closeRowActionsDialog(): void {
    this.showRowActionsDialog = false;
    this.rowActionState.set(null);
  }

  replaceItemFromActions(): void {
    const state = this.rowActionState();
    if (!state) return;
    this.closeRowActionsDialog();
    this.replaceItem(state.index);
  }

  editProductFromActions(): void {
    const state = this.rowActionState();
    if (!state) return;
    const item = this.items()[state.index];
    this.closeRowActionsDialog();
    if (item?.productId) {
      this.router.navigate(['/products'], { queryParams: { editProductId: item.productId } });
      this.notification.add({
        severity: 'info',
        summary: 'Редактирование товара',
        detail: 'Открыт справочник товаров. Выберите нужную карточку для редактирования.',
      });
      return;
    }
    this.notification.add({
      severity: 'warn',
      summary: 'Нет связи с товаром',
      detail: 'Эта позиция не привязана к карточке товара. Используйте "Заменить товар".',
    });
  }

  removeItemFromActions(): void {
    const state = this.rowActionState();
    if (!state) return;
    this.closeRowActionsDialog();
    this.removeItem(state.index);
  }

  selectItem(index: number): void {
    if (index >= 0 && index < this.items().length) {
      this.selectedItemIndex.set(index);
    }
  }

  replaceItem(index: number): void {
    this.selectItem(index);
    this.replaceItemIndex.set(index);
    this.productPickerVisible.set(true);
  }

  openPhotoZoom(url: string): void {
    if (!url) return;
    this.photoZoomUrl = url;
    this.showPhotoZoomDialog = true;
  }

  onProductsSelected(products: IProduct[]): void {
    const start = this.items().length;
    this.items.update((items) => [
      ...items,
      ...products.map((p, i) => ({
        productId: p._id,
        sku: p.sku,
        name: p.name,
        qty: 1,
        unit: p.unit,
        price: p.listPrice ?? 0,
        sum: p.listPrice ?? 0,
        order: start + i,
      })),
    ]);
    for (let i = 0; i < products.length; i++) {
      this.recalcItem(start + i);
    }
    if (products.length > 0) {
      this.selectItem(start);
    }
    this.productPickerVisible.set(false);
  }

  onProductReplaced(product: IProduct): void {
    const idx = this.replaceItemIndex();
    if (idx === null) return;
    const qty = this.items()[idx]?.qty ?? 1;
    this.items.update((items) => {
      const updated = [...items];
      updated[idx] = {
        ...updated[idx],
        productId: product._id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        price: product.listPrice ?? 0,
        sum: (product.listPrice ?? 0) * qty,
      };
      return updated;
    });
    this.recalcItem(idx);
    this.replaceItemIndex.set(null);
    this.productPickerVisible.set(false);
  }

  removeItem(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
    const sel = this.selectedItemIndex();
    if (sel === null) return;
    if (sel === index) {
      const next = this.items();
      this.selectedItemIndex.set(next.length ? Math.min(index, next.length - 1) : null);
    } else if (sel > index) {
      this.selectedItemIndex.set(sel - 1);
    }
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
    this.selectItem(index);
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
        align: 'center',
        paddingTop: 8,
        paddingBottom: 8,
      },
    };
    if (type === 'text') {
      newBlock.title = '';
      newBlock.cells = [{ content: 'Новый текст...' }];
      newBlock.content = '';
    }
    this.blocks.update((blocks) => [...blocks, this.withClientKey(newBlock)]);
  }

  addTableBlock(): void {
    this.showAddMenu = false;
    const option = QUOTATION_TABLE_BLOCK_OPTIONS.find((o) => o.kind === this.selectedTableKind)
      ?? QUOTATION_TABLE_BLOCK_OPTIONS[0];
    const newBlock: EditorBlock = {
      type: 'table',
      order: this.blocks().length,
      title: option.title,
      tableKind: option.kind,
      content: '',
      settings: {
        fontSize: 10,
        fontWeight: 'normal',
        align: 'left',
        paddingTop: 8,
        paddingBottom: 8,
      },
    };
    this.blocks.update((blocks) => [...blocks, this.withClientKey(newBlock)]);
  }

  toggleBlocksReorderLock(): void {
    this.blocksReorderLocked.update((locked) => !locked);
    this.activeBlockIndex.set(null);
  }

  hasEditableControls(block: EditorBlock): boolean {
    return block.type === 'text' || block.type === 'header' || block.type === 'separator' || block.type === 'table';
  }

  setActiveBlock(index: number): void {
    if (this.blocksReorderLocked() || this.isDraggingBlock()) return;
    this.activeBlockIndex.set(index);
  }

  clearActiveBlock(index: number): void {
    if (this.activeBlockIndex() === index) {
      this.activeBlockIndex.set(null);
    }
  }

  isBlockControlsVisible(index: number, block: EditorBlock): boolean {
    return this.hasEditableControls(block) && this.activeBlockIndex() === index && !this.isDraggingBlock();
  }

  onBlockDragStarted(index: number): void {
    this.isDraggingBlock.set(true);
    this.activeBlockIndex.set(index);
  }

  onBlockDragEnded(): void {
    this.isDraggingBlock.set(false);
    this.activeBlockIndex.set(null);
  }

  setBlockAlign(index: number, align: 'left' | 'center' | 'right'): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block || (block.type !== 'text' && block.type !== 'header')) return blocks;

      if (block.type === 'text') {
        const normalized = this.normalizeTextBlock(block);
        const cells = (normalized.cells ?? []).map((cell) => ({
          ...this.normalizeCell(cell, align),
          align,
        }));
        updated[index] = this.syncTextBlockContent({
          ...normalized,
          cells,
          settings: { ...normalized.settings, align },
        });
      } else {
        updated[index] = {
          ...block,
          settings: { ...block.settings, align },
        };
      }
      return updated;
    });
  }

  setBlockColor(index: number, value: string): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block) return blocks;
      const settings = { ...block.settings };
      if (value) {
        settings.color = value;
      } else {
        delete settings.color;
      }
      updated[index] = { ...block, settings };
      return updated;
    });
  }

  toggleBlockFontWeight(index: number): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block) return blocks;
      const next = block.settings.fontWeight === 'bold' ? 'normal' : 'bold';
      updated[index] = {
        ...block,
        settings: { ...block.settings, fontWeight: next },
      };
      return updated;
    });
  }

  cycleBlockBorder(index: number): void {
    if (!this.isValidBlockIndex(index)) return;
    const order: ('none' | 'dashed' | 'solid')[] = ['none', 'dashed', 'solid'];
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block || (block.type !== 'text' && block.type !== 'header')) return blocks;
      const current = block.settings.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
      const next = order[(order.indexOf(current) + 1) % order.length];
      updated[index] = {
        ...block,
        settings: { ...block.settings, borderStyle: next },
      };
      return updated;
    });
  }

  blockColorActive(block: EditorBlock, value: string): boolean {
    return (block.settings.color ?? '') === value;
  }

  blockBorderActive(block: EditorBlock): boolean {
    const style = block.settings.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
    return style !== 'none';
  }

  blockVisualStyles(block: EditorBlock): Record<string, string> {
    const s = block.settings;
    const styles: Record<string, string> = {};
    if (s.color) {
      styles['color'] = s.color;
    }
    if (s.backgroundColor) {
      styles['background-color'] = s.backgroundColor;
    }
    const border = s.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
    if (border === 'solid') {
      styles['border'] = '1px solid var(--kp-border)';
      styles['border-radius'] = 'var(--kp-radius-sm)';
    } else if (border === 'dashed') {
      styles['border'] = '1px dashed var(--kp-border)';
      styles['border-radius'] = 'var(--kp-radius-sm)';
    }
    return styles;
  }

  onBlockDropped(event: KpSortableDropEvent<EditorBlock>): void {
    if (this.blocksReorderLocked()) return;
    if (event.previousIndex === event.currentIndex) return;
    const len = this.blocks().length;
    if (
      event.previousIndex < 0 ||
      event.currentIndex < 0 ||
      event.previousIndex >= len ||
      event.currentIndex >= len
    ) {
      return;
    }

    this.blocks.update(blocks => {
      const reordered = moveSortableItems(blocks, event);
      return reordered.map((block, order) => ({ ...block, order, clientKey: block.clientKey ?? this.nextBlockClientKey() }));
    });
  }

  removeBlock(index: number): void {
    if (!this.isValidBlockIndex(index) || this.blocks().length <= 1) return;
    this.blocks.update((blocks) => blocks.filter((_, i) => i !== index));
  }

  editTextBlock(index: number): void {
    if (!this.isValidBlockIndex(index)) return;
    const block = this.blocks()[index];
    if (block.type !== 'text') return;
    this.editingTextIndex = index;
    this.editingTextBlock = JSON.parse(JSON.stringify(this.normalizeTextBlock(block)));
    this.showTextEditor = true;
  }

  editTextCell(blockIndex: number, cellIndex: number): void {
    if (!this.isValidBlockIndex(blockIndex)) return;
    const block = this.blocks()[blockIndex];
    if (block.type !== 'text') return;
    this.editingTextIndex = blockIndex;
    this.editingTextBlock = JSON.parse(JSON.stringify(this.normalizeTextBlock(block)));
    this.openCellEditor(cellIndex);
  }

  openCellEditor(cellIndex: number): void {
    this.editingCellIndex = cellIndex;
    const cells = this.editingTextBlock.cells ?? [{ content: this.editingTextBlock.content }];
    const cell = this.normalizeCell(cells[cellIndex] ?? { content: '' });
    this.editingCellContent = cell.content;
    this.editingCellAlign = cell.align ?? 'center';
    this.showCellEditor = true;
  }

  addCell(): void {
    const cells = [...(this.editingTextBlock.cells ?? [{ content: this.editingTextBlock.content }])];
    if (cells.length >= this.maxTextCells) return;
    cells.push({ content: '', align: 'center' });
    this.editingTextBlock = { ...this.editingTextBlock, cells };
  }

  deleteCell(cellIndex: number): void {
    const cells = [...(this.editingTextBlock.cells ?? [{ content: this.editingTextBlock.content }])];
    if (cells.length <= 1) return;
    cells.splice(cellIndex, 1);
    this.editingTextBlock = { ...this.editingTextBlock, cells };
  }

  confirmCellEdit(): void {
    if (this.editingCellIndex >= 0) {
      const cells = [...(this.editingTextBlock.cells ?? [{ content: this.editingTextBlock.content }])];
      cells[this.editingCellIndex] = {
        content: this.editingCellContent,
        align: this.editingCellAlign,
      };
      this.editingTextBlock = { ...this.editingTextBlock, cells };

      if (this.editingTextIndex >= 0 && !this.showTextEditor) {
        this.persistEditingTextBlock();
      }
    }
    this.showCellEditor = false;
    this.editingCellIndex = -1;
    this.editingCellContent = '';
    this.editingCellAlign = 'center';
  }

  confirmTextEdit(): void {
    if (this.editingTextIndex >= 0) {
      this.persistEditingTextBlock();
    }
    this.showTextEditor = false;
    this.editingTextIndex = -1;
  }

  private persistEditingTextBlock(): void {
    if (this.editingTextIndex < 0) return;
    const synced = this.syncTextBlockContent(this.editingTextBlock);
    this.blocks.update(blocks => {
      const updated = [...blocks];
      updated[this.editingTextIndex] = { ...synced };
      return updated;
    });
    this.editingTextIndex = -1;
  }

  getCells(block: EditorBlock): EditorBlockCell[] {
    return this.normalizeTextBlock(block).cells ?? [{ content: block.content }];
  }

  onAddCell(blockIndex: number): void {
    if (!this.isValidBlockIndex(blockIndex)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = this.normalizeTextBlock(updated[blockIndex]);
      const cells = [...(block.cells ?? [])];
      if (cells.length >= this.maxTextCells) return blocks;
      cells.push({ content: '', align: 'center' });
      updated[blockIndex] = this.syncTextBlockContent({ ...block, cells });
      return updated;
    });
  }

  onEditCell(blockIndex: number, cellIndex: number): void {
    this.editTextCell(blockIndex, cellIndex);
  }

  private isValidBlockIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.blocks().length;
  }

  private normalizeCell(
    cell: EditorBlockCell,
    fallbackAlign: 'left' | 'center' | 'right' = 'center',
  ): EditorBlockCell {
    return {
      content: cell.content ?? '',
      align: cell.align ?? fallbackAlign,
    };
  }

  private normalizeTextBlock(block: EditorBlock): EditorBlock {
    if (block.type !== 'text') return block;
    const fallbackAlign = block.settings.align ?? 'center';
    if (block.cells && block.cells.length > 0) {
      return {
        ...block,
        cells: block.cells.map((cell) => this.normalizeCell(cell, fallbackAlign)),
      };
    }
    return {
      ...block,
      cells: [{ content: block.content || '', align: fallbackAlign }],
    };
  }

  private normalizeBlocks(blocks: EditorBlock[]): EditorBlock[] {
    return blocks.map((block) => this.withClientKey(this.normalizeTableBlock(this.normalizeTextBlock(block))));
  }

  private normalizeTableBlock(block: EditorBlock): EditorBlock {
    if (block.type !== 'table') return block;
    return {
      ...block,
      tableKind: block.tableKind ?? 'products',
      title: block.title ?? 'Товары',
    };
  }

  private syncTextBlockContent(block: EditorBlock): EditorBlock {
    if (block.type !== 'text') return block;
    const normalized = this.normalizeTextBlock(block);
    const cells = normalized.cells ?? [];
    return {
      ...normalized,
      content: cells.map((cell) => cell.content).join('\n\n') || cells[0]?.content || '',
      settings: {
        ...normalized.settings,
        columns: cells.length,
      },
    };
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
    return _block._id || _block.clientKey || `${_block.type}-${index}`;
  }

  private blockKeySeq = 0;

  private nextBlockClientKey(): string {
    this.blockKeySeq += 1;
    return `b-${this.blockKeySeq}`;
  }

  private withClientKey(block: EditorBlock): EditorBlock {
    if (block.clientKey) {
      return block;
    }
    return { ...block, clientKey: this.nextBlockClientKey() };
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
      this.blocks.set(this.normalizeBlocks(JSON.parse(JSON.stringify(tmpl.blocks))));
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
