import { Component, input, model, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { KpInputComponent } from './kp-input.component';
import { KpButtonComponent } from './kp-button.component';
import type { PhotoItem } from '../../../../shared/types';

const DEFAULT_POSITION = { x: 50, y: 50 };

@Component({
  selector: 'app-kp-photo-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, KpInputComponent, KpButtonComponent],
  template: `
    <div class="kp-photo-uploader">
      @if (label()) {
        <span class="kp-photo-uploader__label">{{ label() }}</span>
      }
      <!-- Gallery: existing photos -->
      @if (photos().length > 0) {
        <div class="photos-gallery">
          @for (photo of photos(); track photo.url; let i = $index) {
            <div
              class="photos-gallery__item"
              (click)="zoom(photo.url)"
              (keydown.enter)="zoom(photo.url)"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Открыть фото ' + (i + 1)"
            >
              <img
                [src]="photo.url"
                alt="Фото {{ i + 1 }}"
                loading="lazy"
                [style.object-position]="posStyle(photo)"
                [style.transform]="'scale(' + (photo.scale || 1) + ')'"
              />
              <button
                type="button"
                class="photos-gallery__frame-btn"
                (click)="openFrameEditor(i, $event)"
                [attr.aria-label]="'Настроить рамку фото ' + (i + 1)"
                title="Настроить рамку"
              >
                <i class="pi pi-crop" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="photos-gallery__remove"
                (click)="remove(i, $event)"
                [attr.aria-label]="'Удалить фото ' + (i + 1)"
                title="Удалить фото"
              >
                <i class="pi pi-times" aria-hidden="true"></i>
              </button>
            </div>
          }
        </div>
      }

      <!-- Drop zone -->
      <div
        class="kp-photo-uploader__dropzone"
        [class.kp-photo-uploader__dropzone--active]="isDragOver()"
        [class.kp-photo-uploader__dropzone--loading]="isProcessing()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        @if (isProcessing()) {
          <i class="pi pi-spinner pi-spin kp-photo-uploader__dropzone-icon" aria-hidden="true"></i>
          <span class="kp-photo-uploader__dropzone-text">Загрузка фото…</span>
        } @else {
          <i class="pi pi-cloud-upload kp-photo-uploader__dropzone-icon" aria-hidden="true"></i>
          <span class="kp-photo-uploader__dropzone-text">
            Перетащите фото сюда или&nbsp;
            <button
              type="button"
              class="kp-photo-uploader__browse-btn"
              (click)="fileInput.click()"
            >
              выберите файлы
            </button>
          </span>
        }

        <!-- Hidden file input -->
        <input
          #fileInput
          type="file"
          accept="image/*"
          multiple
          hidden
          (change)="onFilesSelected($event)"
        />
      </div>

      <!-- URL input row -->
      <div class="photos-add-row">
        <div class="photos-add-row__input">
          <app-kp-input
            name="newPhotoUrl"
            placeholder="https://... или вставьте URL"
            [value]="newUrl()"
            (valueChange)="newUrl.set($event)"
          />
        </div>
        <app-kp-button
          icon="pi pi-plus"
          [rounded]="true"
          severity="secondary"
          [outlined]="true"
          size="small"
          (buttonClick)="addUrl()"
          tooltip="Добавить URL"
          ariaLabel="Добавить URL"
        />
      </div>
    </div>

    <!-- Frame Editor Overlay -->
    @if (editingFrameIndex() !== null) {
      <div
        class="photo-frame-overlay"
        (click)="closeFrameEditor()"
        (keydown.escape)="closeFrameEditor()"
        role="dialog"
        aria-label="Настройка рамки фото"
        tabindex="0"
      >
        <div
          class="photo-frame-editor"
          (click)="$event.stopPropagation()"
          (keydown.escape)="closeFrameEditor()"
          tabindex="-1"
        >
          <div class="photo-frame-editor__header">
            <span>Настройка рамки</span>
            <button
              type="button"
              class="photo-frame-editor__close"
              (click)="closeFrameEditor()"
              aria-label="Закрыть"
              title="Закрыть"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>

          <div
            class="photo-frame-editor__preview"
            (mousedown)="onFrameMouseDown($event)"
            (mousemove)="onFrameMouseMove($event)"
            (mouseup)="onFrameMouseUp()"
            (mouseleave)="onFrameMouseUp()"
          >
            <img
              [src]="photos()[editingFrameIndex()!].url"
              alt="Превью"
              draggable="false"
              [style.object-fit]="'cover'"                [style.object-position]="posStyle(photos()[editingFrameIndex()!])"
              [style.transform]="'scale(' + (photos()[editingFrameIndex()!].scale || 1) + ')'"
            />
            <span class="photo-frame-editor__hint" aria-hidden="true">
              <i class="pi pi-arrows-alt"></i>&nbsp;Перетащите для позиционирования
            </span>
          </div>

          <div class="photo-frame-editor__controls">
            <div class="photo-frame-editor__zoom">
              <label for="frame-zoom-slider" class="photo-frame-editor__zoom-label">
                Масштаб: {{ ((photos()[editingFrameIndex()!].scale || 1) * 100) | number:'1.0-0' }}%
              </label>
              <input
                id="frame-zoom-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                [value]="photos()[editingFrameIndex()!].scale || 1"
                (input)="onFrameScaleChange($event, editingFrameIndex()!)"
              />
            </div>
            <div class="photo-frame-editor__actions">
              <app-kp-button
                label="Сбросить"
                icon="pi pi-refresh"
                severity="secondary"
                [outlined]="true"
                size="small"
                (buttonClick)="resetFrame(editingFrameIndex()!)"
              />
              <app-kp-button
                label="Готово"
                icon="pi pi-check"
                size="small"
                (buttonClick)="closeFrameEditor()"
              />
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Zoom overlay -->
    @if (zoomedUrl(); as src) {
      <div
        class="photo-zoom-overlay"
        (click)="zoomedUrl.set(null)"
        (keydown.escape)="zoomedUrl.set(null)"
        (keydown.enter)="zoomedUrl.set(null)"
        role="dialog"
        aria-label="Просмотр фото"
      >
        <button
          type="button"
          class="photo-zoom-overlay__close"
          (click)="zoomedUrl.set(null); $event.stopPropagation()"
          aria-label="Закрыть"
          title="Закрыть"
        >
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
        <img [src]="src" alt="Фото товара" />
      </div>
    }
  `,
  styleUrl: './kp-photo-uploader.component.scss',
})
export class KpPhotoUploaderComponent {
  /** Optional label shown above the uploader */
  readonly label = input<string>('');

  /** Two-way bound photos array with frame settings */
  readonly photos = model<PhotoItem[]>([]);

  /** Drag-over state for the drop zone */
  readonly isDragOver = signal(false);

  /** URL input field value */
  readonly newUrl = signal('');

  /** Currently zoomed photo URL (null = closed) */
  readonly zoomedUrl = signal<string | null>(null);

  /** Whether files are being processed (converted to base64) */
  readonly isProcessing = signal(false);

  /** Index of photo being frame-edited (null = closed) */
  readonly editingFrameIndex = signal<number | null>(null);

  /** Internal drag state for frame editor */
  private readonly frameDrag = signal<{
    startX: number; startY: number;
    posX: number; posY: number;
  } | null>(null);

  // ── Helpers ──

  posStyle(photo: PhotoItem): string {
    const pos = photo.position || DEFAULT_POSITION;
    return `${pos.x}% ${pos.y}%`;
  }

  // ── Drag & Drop ──

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(files);
    }
  }

  // ── File input ──

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.processFiles(files);
    }
    input.value = '';
  }

  // ── URL input ──

  addUrl(): void {
    const url = this.newUrl().trim();
    if (!url) return;
    const item: PhotoItem = { url };
    this.photos.update((arr) => [...arr, item]);
    this.newUrl.set('');
  }

  // ── Remove ──

  remove(index: number, event: Event): void {
    event.stopPropagation();
    this.photos.update((arr) => arr.filter((_, i) => i !== index));
    if (this.editingFrameIndex() === index) {
      this.editingFrameIndex.set(null);
    }
  }

  // ── Zoom ──

  zoom(url: string): void {
    this.zoomedUrl.set(url);
  }

  // ── Frame Editor ──

  openFrameEditor(index: number, event: Event): void {
    event.stopPropagation();
    this.editingFrameIndex.set(index);
  }

  closeFrameEditor(): void {
    this.editingFrameIndex.set(null);
    this.frameDrag.set(null);
  }

  onFrameMouseDown(event: MouseEvent): void {
    const idx = this.editingFrameIndex();
    if (idx === null) return;
    const photo = this.photos()[idx];
    const pos = photo.position || DEFAULT_POSITION;
    this.frameDrag.set({
      startX: event.clientX,
      startY: event.clientY,
      posX: pos.x,
      posY: pos.y,
    });
  }

  onFrameMouseMove(event: MouseEvent): void {
    const drag = this.frameDrag();
    if (!drag) return;
    const idx = this.editingFrameIndex();
    if (idx === null) return;

    const container = (event.currentTarget as HTMLElement).querySelector('img')?.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;

    const x = Math.max(0, Math.min(100, drag.posX + dx));
    const y = Math.max(0, Math.min(100, drag.posY + dy));

    this.photos.update((arr) => {
      const updated = [...arr];
      updated[idx] = { ...updated[idx], position: { x, y } };
      return updated;
    });
  }

  onFrameMouseUp(): void {
    this.frameDrag.set(null);
  }

  onFrameScaleChange(event: Event, idx: number): void {
    const scale = parseFloat((event.target as HTMLInputElement).value);
    this.photos.update((arr) => {
      const updated = [...arr];
      updated[idx] = { ...updated[idx], scale };
      return updated;
    });
  }

  resetFrame(idx: number): void {
    this.photos.update((arr) => {
      const updated = [...arr];
      updated[idx] = { ...updated[idx], position: { x: 50, y: 50 }, scale: 1 };
      return updated;
    });
  }

  // ── Internal: file → base64 ──

  private processFiles(fileList: FileList): void {
    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/'),
    );

    if (imageFiles.length === 0) return;

    this.isProcessing.set(true);
    Promise.all(imageFiles.map((f) => this.fileToBase64(f)))
      .then((dataUrls) => {
        const items: PhotoItem[] = dataUrls.map((url) => ({ url }));
        this.photos.update((arr) => [...arr, ...items]);
      })
      .catch((err) => {
        console.warn('[KpPhotoUploader] Failed to convert file(s):', err);
      })
      .finally(() => {
        this.isProcessing.set(false);
      });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }
}
