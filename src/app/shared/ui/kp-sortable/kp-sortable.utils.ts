import { moveItemInArray } from '@angular/cdk/drag-drop';

import type { KpSortableDropEvent } from './kp-sortable.types';

export function moveSortableItems<T>(array: T[], event: KpSortableDropEvent<T>): T[] {
  const updated = [...array];
  moveItemInArray(updated, event.previousIndex, event.currentIndex);
  return updated;
}
