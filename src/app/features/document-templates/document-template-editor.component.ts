import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  viewChild,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CrudApiService } from '../../shared/services/crud-api.service';
import { NotificationService } from '../../core/notification.service';
import { KpButtonComponent, KpPlaceholderPickerComponent, KpDocumentBlockEditorComponent } from '../../shared/ui';
import type { IDocumentTemplate, IDocumentBlock } from '../../../../shared/types/documentTemplate.interface';
import type { DocCanvasBlock } from '../../shared/ui/kp-document-block-editor/kp-document-block-editor.types';

@Component({
  selector: 'app-document-template-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KpButtonComponent, KpPlaceholderPickerComponent, KpDocumentBlockEditorComponent],
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

        <!-- A4 Canvas -->
        <div class="template-editor__canvas-container">
          <app-kp-document-block-editor
            #canvas
            mode="template"
            [backgroundImage]="template()!.backgroundImage"
            (blocksChange)="onBlocksChange($event)"
            (backgroundChange)="onBackgroundChange($event)"
            (placeholderRequested)="pickerVisible.set(true)"
          />
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

  // ── Canvas ref (не required — DOM появляется после загрузки шаблона) ──
  readonly canvas = viewChild<KpDocumentBlockEditorComponent>('canvas');

  // ── Состояние шаблона ──
  readonly template = signal<IDocumentTemplate | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // ── UI ──
  readonly pickerVisible = signal(false);
  readonly saving = signal(false);
  readonly dirty = signal(false);

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
            // Передать блоки в canvas после рендера (silent, чтобы не отметить как dirty)
            // canvas() доступен только после того, как @if (template()) отрендерит DOM
            setTimeout(() => {
              this.canvas()?.setBlocks(data.blocks as DocCanvasBlock[], true);
            }, 0);
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

  // ── Canvas events ──
  onBlocksChange(blocks: DocCanvasBlock[]): void {
    this.template.update((t) => (t ? { ...t, blocks: blocks as IDocumentBlock[] } : null));
    this.dirty.set(true);
  }

  onBackgroundChange(bg: string | undefined): void {
    this.template.update((t) => (t ? { ...t, backgroundImage: bg } : null));
    this.dirty.set(true);
  }

  // ── Плейсхолдеры ──
  insertPlaceholder(token: string): void {
    this.canvas()?.insertPlaceholder(token);
  }

  // ── Сохранение ──
  async saveTemplate(): Promise<void> {
    const t = this.template();
    const id = this.route.snapshot.paramMap.get('id');
    if (!t || !id) return;

    this.saving.set(true);
    try {
      await firstValueFrom(
        this.api.update<IDocumentTemplate>('/document-templates', id, {
          blocks: t.blocks,
          backgroundImage: t.backgroundImage,
        }),
      );
      this.dirty.set(false);
      this.notification.success('Шаблон сохранён');
    } catch (err: unknown) {
      const msg =
        (err as { error?: { error?: string }; message?: string })?.error?.error ??
        (err as { message?: string })?.message ??
        'Ошибка сохранения';
      this.notification.error('Ошибка', msg);
    } finally {
      this.saving.set(false);
    }
  }
}
