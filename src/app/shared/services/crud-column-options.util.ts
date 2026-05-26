import type { WritableSignal } from '@angular/core';
import type { KpColumn } from '../ui/kp-table.component';
import type { KpSelectOption } from '../ui/kp-select.component';

/** Подставляет options в колонку таблицы и переключает тип на select. */
export function patchCrudColumnOptions(
  columns: WritableSignal<KpColumn[]>,
  field: string,
  options: KpSelectOption[],
): void {
  columns.update((cols) =>
    cols.map((col) =>
      col.field === field ? { ...col, type: 'select', options } : col,
    ),
  );
}
