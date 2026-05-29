import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { CrudApiService } from '../../shared/services/crud-api.service';
import { NotificationService } from '../../core/notification.service';
import { KpButtonComponent, KpPlaceholderPickerComponent } from '../../shared/ui';
import type { IDocumentTemplate, IDocumentBlock } from '../../../../shared/types/documentTemplate.interface';

@Component({
  selector: 'app-document-template-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, KpButtonComponent, KpPlaceholderPickerComponent],
  styleUrl: './document-template-editor.component.scss',
  template: `
    <div class="template-editor">
      <!-- Шапка -->
      <div class="template-editor__toolbar">
        <a routerLink="/document-templates" class="template-editor__back">
          <i class="pi pi-arrow-left" aria-hidden="true"></i>
          Шаблоны
        </a>
        <h1 class="template-editor__title">{{ template()?.name || 'Редактор шаблона' }}</h1>
        <div class="template-editor__toolbar-actions">
          @if (dirty()) {
            <span class="template-editor__dirty-badge">Не сохранено</span>
          }
          <app-kp-button
            label="Сохранить"
            icon="pi pi-save"
            [loading]="saving()"
            [disabled]="!dirty() || saving()"
            size="small"
            (buttonClick)="saveTemplate()"
          />
        </div>
      </div>

      <!-- Состояния: загрузка / ошибка -->
      @if (loading()) {
        <div class="template-editor__loading">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
          Загрузка...
        </div>
      } @else if (error()) {
        <div class="template-editor__error" role="alert">
          <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
          {{ error() }}
          <app-kp-button
            label="Назад к списку"
            severity="secondary"
            size="small"
            (buttonClick)="goBack()"
          />
        </div>
      } @else if (template()) {
        <!-- Метаинформация шаблона -->
        <div class="template-editor__info">
          <div class="template-editor__meta">
            <span class="template-editor__meta-item">
              <strong>Тип:</strong> {{ docTypeLabel() }}
            </span>
            <span class="template-editor__meta-item">
              <strong>По умолчанию:</strong> {{ template()!.isDefault ? 'Да' : 'Нет' }}
            </span>
            <span class="template-editor__meta-item">
              <strong>Блоков:</strong> {{ template()!.blocks.length }}
            </span>
          </div>
          @if (template()!.description) {
            <p class="template-editor__desc">{{ template()!.description }}</p>
          }
          @if (template()!.tags?.length) {
            <div class="template-editor__tags">
              @for (tag of template()!.tags; track tag) {
                <span class="template-editor__tag">{{ tag }}</span>
              }
            </div>
          }
        </div>

        <!-- Список блоков -->
        <div class="template-editor__layout">
          <!-- Левая панель: список блоков -->
          <aside class="template-editor__blocks-panel">
            <h3 class="template-editor__panel-title">Блоки шаблона</h3>
            @if (template()!.blocks.length) {
              <ul class="template-editor__block-list">
                @for (block of template()!.blocks; track block._id || $index; let i = $index) {
                  <li
                    class="template-editor__block-item"
                    [class.template-editor__block-item--active]="activeBlockIndex() === i"
                    tabindex="0"
                    role="button"
                    [attr.aria-label]="'Редактировать блок ' + (block.title || blockLabel(block.type) + ' ' + (i + 1))"
                    (click)="selectBlock(i)"
                    (keydown.enter)="selectBlock(i)"
                    (keydown.space)="selectBlock(i); $event.preventDefault()"
                  >
                    <span class="template-editor__block-item-icon">
                      <i [class]="blockIcon(block.type)" aria-hidden="true"></i>
                    </span>
                    <span class="template-editor__block-item-text">
                      {{ block.title || blockLabel(block.type) + ' ' + (i + 1) }}
                    </span>
                  </li>
                }
              </ul>
            } @else {
              <p class="template-editor__no-blocks">Нет блоков. Добавьте хотя бы один блок для начала работы.</p>
            }
          </aside>

          <!-- Правая панель: редактор текущего блока -->
          <div class="template-editor__content-panel">
            @if (activeBlock()) {
              <div class="template-editor__block-editor">
                <!-- Заголовок блока -->
                <div class="template-editor__block-header">
                  <span class="template-editor__block-label">
                    {{ activeBlock()!.title || blockLabel(activeBlock()!.type) + ' №' + (activeBlockIndex() + 1) }}
                  </span>
                  <span class="template-editor__block-type-badge">{{ activeBlock()!.type }}</span>
                </div>

                <!-- Тулбар блока -->
                <div class="template-editor__block-toolbar">
                  <app-kp-button
                    label="Вставить плейсхолдер"
                    icon="pi pi-tag"
                    severity="secondary"
                    size="small"
                    [outlined]="true"
                    (buttonClick)="pickerVisible.set(true)"
                  />
                  <span class="template-editor__hint">
                    Нажмите чтобы вставить <code ngNonBindable>{{токен}}</code> в позицию курсора
                  </span>
                </div>

                <!-- Контент блока -->
                <textarea
                  #contentEl
                  class="template-editor__block-content"
                  [ngModel]="activeContent()"
                  (ngModelChange)="onContentChange($event)"
                  rows="10"
                  placeholder="Введите текст блока. Нажмите «Вставить плейсхолдер» для подстановки данных..."
                ></textarea>
              </div>
            } @else {
              <div class="template-editor__canvas-empty">
                <div class="template-editor__canvas-empty-icon">
                  <i class="pi pi-file-edit" aria-hidden="true"></i>
                </div>
                <h3>Блок не выбран</h3>
                <p>Выберите блок из левой панели или создайте новый.</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- Пикер плейсхолдеров -->
      <app-kp-placeholder-picker
        [(visible)]="pickerVisible"
        (placeholderSelected)="insertPlaceholder($event)"
      />
    </div>
  `,
})
export class DocumentTemplateEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CrudApiService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Состояние шаблона ──

  readonly template = signal<IDocumentTemplate | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // ── Редактор блоков ──

  readonly activeBlockIndex = signal(0);
  readonly activeContent = signal('');
  readonly pickerVisible = signal(false);

  readonly saving = signal(false);
  readonly dirty = signal(false);

  readonly contentEl = viewChild<ElementRef<HTMLTextAreaElement>>('contentEl');

  /** Активный блок — тот, что выбран в левой панели */
  readonly activeBlock = computed<IDocumentBlock | null>(() => {
    const t = this.template();
    if (!t?.blocks?.length) return null;
    const idx = this.activeBlockIndex();
    return t.blocks[idx] ?? t.blocks[0] ?? null;
  });

  readonly docTypeLabels: Record<string, string> = {
    quotation: 'Коммерческое предложение',
    contract: 'Договор',
    invoice: 'Счёт',
    shipping: 'Отгрузочный документ',
  };

  readonly docTypeLabel = computed(() => {
    const dt = this.template()?.docType;
    return dt ? (this.docTypeLabels[dt] ?? dt) : '—';
  });

  readonly blockTypeLabels: Record<string, string> = {
    text: 'Текст',
    header: 'Заголовок',
    table: 'Таблица',
    separator: 'Разделитель',
    image: 'Изображение',
  };

  readonly blockTypeIcons: Record<string, string> = {
    text: 'pi pi-align-left',
    header: 'pi pi-text-size',
    table: 'pi pi-table',
    separator: 'pi pi-minus',
    image: 'pi pi-image',
  };

  // ── Init ──

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Не указан ID шаблона');
      this.loading.set(false);
      return;
    }

    this.api
      .getById<IDocumentTemplate>('/document-templates', id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: (data: IDocumentTemplate) => {
            this.template.set(data);
            this.loading.set(false);
            // Инициализируем контент первого текстового/header блока
            this.syncActiveContent();
          },
          error: () => {
            this.error.set('Не удалось загрузить шаблон');
            this.loading.set(false);
          },
        }),
      )
      .subscribe();
  }

  // ── Навигация ──

  goBack(): void {
    void this.router.navigate(['/document-templates']);
  }

  // ── Блоки ──

  selectBlock(index: number): void {
    this.activeBlockIndex.set(index);
    this.syncActiveContent();
  }

  blockLabel(type: string): string {
    return this.blockTypeLabels[type] ?? type;
  }

  blockIcon(type: string): string {
    return this.blockTypeIcons[type] ?? 'pi pi-file';
  }

  /** Синхронизирует activeContent с текущим блоком */
  private syncActiveContent(): void {
    const block = this.activeBlock();
    this.activeContent.set(block?.content ?? '');
  }

  /** Синхронизирует контент блока: activeContent + template().blocks[idx].content + dirty */
  private syncBlockContent(updated: string): void {
    this.activeContent.set(updated);
    this.dirty.set(true);
    const t = this.template();
    const idx = this.activeBlockIndex();
    if (t?.blocks?.[idx]) {
      t.blocks[idx].content = updated;
    }
  }

  onContentChange(value: string): void {
    this.syncBlockContent(value);
  }

  // ── Сохранение ──

  async saveTemplate(): Promise<void> {
    const t = this.template();
    const id = this.route.snapshot.paramMap.get('id');
    if (!t || !id) return;

    this.saving.set(true);
    try {
      await firstValueFrom(this.api.update<IDocumentTemplate>('/document-templates', id, { blocks: t.blocks }));
      this.dirty.set(false);
      this.notification.success('Шаблон сохранён');
    } catch (err: unknown) {
      const msg = (err as { error?: { error?: string }; message?: string })?.error?.error
        ?? (err as { message?: string })?.message
        ?? 'Ошибка сохранения';
      this.notification.error('Ошибка', msg);
    } finally {
      this.saving.set(false);
    }
  }

  // ── Плейсхолдеры ──

  /**
   * Вставляет токен в позицию курсора внутри textarea.
   * Если textarea не в фокусе — добавляет в конец.
   */
  insertPlaceholder(token: string): void {
    const el = this.contentEl()?.nativeElement;
    if (!el) {
      // Fallback: добавляем в конец, синхронизируем через syncBlockContent
      this.syncBlockContent(this.activeContent() + token);
      return;
    }

    const start = el.selectionStart ?? this.activeContent().length;
    const end = el.selectionEnd ?? start;
    const current = this.activeContent();
    const updated = current.substring(0, start) + token + current.substring(end);

    this.syncBlockContent(updated);

    // Восстанавливаем курсор после ререндера Angular
    setTimeout(() => {
      el.focus();
      const newPos = start + token.length;
      el.setSelectionRange(newPos, newPos);
    });
  }
}
