import { Directive } from '@angular/core';
import { CdkDropList } from '@angular/cdk/drag-drop';

@Directive({
  selector: '[appKpSortableList]',
  standalone: true,
  hostDirectives: [
    {
      directive: CdkDropList,
      inputs: [
        'cdkDropListData: appKpSortableListData',
        'cdkDropListDisabled: appKpSortableListDisabled',
      ],
      outputs: ['cdkDropListDropped: appKpSortableListDropped'],
    },
  ],
  host: {
    class: 'kp-sortable-list',
  },
})
export class KpSortableListDirective {}
