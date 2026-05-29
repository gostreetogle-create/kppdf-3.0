import {
  Component,
  input,
  model,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { KpButtonComponent } from './kp-button.component';

export interface KpTabOption {
  label: string;
  value: string;
  icon?: string;
}

@Component({
  selector: 'app-kp-tab-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KpButtonComponent],
  template: `
    <nav class="kp-tab-group" role="tablist" [attr.aria-label]="ariaLabel()">
      @for (tab of options(); track tab.value) {
        <app-kp-button
          role="tab"
          [label]="tab.label"
          [icon]="tab.icon || ''"
          [severity]="activeTab() === tab.value ? 'primary' : 'secondary'"
          [outlined]="activeTab() !== tab.value"
          size="small"
          variant="flat"
          [attr.aria-selected]="activeTab() === tab.value"
          (buttonClick)="onTabClick(tab.value)"
        />
      }
    </nav>
  `,
  styleUrl: './kp-tab-group.component.scss',
})
export class KpTabGroupComponent {
  readonly options = input.required<KpTabOption[]>();
  readonly activeTab = model<string>('');
  readonly ariaLabel = input('Вкладки');
  readonly tabChange = output<string>();

  onTabClick(value: string): void {
    this.activeTab.set(value);
    this.tabChange.emit(value);
  }
}
