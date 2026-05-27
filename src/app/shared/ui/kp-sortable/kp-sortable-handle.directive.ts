import { Directive } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';

@Directive({
  selector: '[appKpSortableHandle]',
  standalone: true,
  hostDirectives: [{ directive: CdkDragHandle }],
  host: {
    class: 'kp-sortable-handle',
  },
})
export class KpSortableHandleDirective {}
