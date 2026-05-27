import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-layout',
  standalone: true,
  template: `
    <div class="page" [style.max-width]="maxWidth() || null">
      <ng-content select="[page-header]"></ng-content>
      <ng-content select="[page-toolbar]"></ng-content>
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: './page-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLayoutComponent {
  maxWidth = input<string | null>(null);
}
