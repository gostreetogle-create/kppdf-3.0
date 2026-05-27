import { Directive } from '@angular/core';
import { CdkDrag } from '@angular/cdk/drag-drop';

@Directive({
  selector: '[appKpSortableItem]',
  standalone: true,
  hostDirectives: [
    {
      directive: CdkDrag,
      inputs: [
        'cdkDragData: appKpSortableItemData',
        'cdkDragDisabled: appKpSortableItemDisabled',
        'cdkDragLockAxis: appKpSortableLockAxis',
      ],
    },
  ],
  host: {
    class: 'kp-sortable-item',
  },
})
export class KpSortableItemDirective {}
