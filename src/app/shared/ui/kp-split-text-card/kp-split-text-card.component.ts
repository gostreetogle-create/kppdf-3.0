import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

import type { DocumentTextAlign, IDocumentBlock, IDocumentBlockCell } from '../../../../../shared/types';

@Component({
  selector: 'app-kp-split-text-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="kp-split-text-card"
      [class.kp-split-text-card--border-none]="effectiveBorder() === 'none'"
      [class.kp-split-text-card--border-solid]="effectiveBorder() === 'solid'"
      [style.font-size.px]="settings().fontSize ?? 11"
      [style.font-weight]="settings().fontWeight ?? 'normal'"
      [style.color]="settings().color ?? null"
      [style.background]="settings().backgroundColor ?? null"
      [style.--kp-split-cols]="columnCount()"
    >
      @if (title()) {
        <div
          class="kp-split-text-card__title"
          [style.text-align]="settings().align ?? 'center'"
        >
          {{ title() }}
        </div>
      }

      <div class="kp-split-text-card__grid">
        @for (cell of cells(); track $index) {
          <div class="kp-split-text-card__cell">
            <div
              class="kp-split-text-card__cell-content"
              [style.text-align]="cellAlign(cell)"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Колонка ' + ($index + 1) + ', двойной щелчок для редактирования'"
              (dblclick)="onEditCell($event, $index)"
              (keydown.enter)="onEditCell($event, $index)"
            >
              {{ cell.content }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './kp-split-text-card.component.scss',
})
export class KpSplitTextCardComponent {
  readonly title = input<string>('');
  readonly cells = input.required<IDocumentBlockCell[]>();
  readonly settings = input.required<IDocumentBlock['settings']>();
  readonly maxColumns = input(6);

  readonly editCell = output<number>();

  readonly columnCount = computed(() =>
    Math.max(1, Math.min(this.cells().length, this.maxColumns())),
  );

  readonly effectiveBorder = computed(
    () => this.settings().borderStyle ?? 'dashed',
  );

  cellAlign(cell: IDocumentBlockCell): DocumentTextAlign {
    return cell.align ?? this.settings().align ?? 'center';
  }

  onEditCell(event: Event, index: number): void {
    event.stopPropagation();
    this.editCell.emit(index);
  }
}
