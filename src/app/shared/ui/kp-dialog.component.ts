import {
  Component,
  input,
  model,
  output,
  ChangeDetectionStrategy,
  ElementRef,
  inject,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-kp-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule],
  template: `
    <p-dialog
      class="kp-dialog"
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [header]="header()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [blockScroll]="true"
      [closeOnEscape]="true"
      [dismissableMask]="false"
      [focusOnShow]="false"
      [style]="dialogStyle()"
      [attr.aria-label]="dialogAriaLabel() || null"
      (onHide)="onHide()"
      (onShow)="onShow()"
    >
      <ng-content />
      <ng-template pTemplate="footer">
        <ng-content select="[kpDialogFooter]" />
      </ng-template>
    </p-dialog>
  `,
  styleUrl: './kp-dialog.component.scss',
})
export class KpDialogComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  readonly visible = model(false);
  readonly header = input('');
  readonly width = input('480px');
  /** Доступность: подпись диалога, если заголовок недостаточен */
  readonly ariaLabel = input('');
  readonly hide = output<void>();
  readonly visibleChange = output<boolean>();

  constructor() {
    effect(() => {
      if (!this.visible() || !isPlatformBrowser(this.platformId)) return;
      queueMicrotask(() => this.focusFirstField());
    });
  }

  dialogAriaLabel(): string {
    return this.ariaLabel().trim() || this.header().trim();
  }

  dialogStyle(): Record<string, string> {
    return { width: this.width(), maxWidth: '90vw' };
  }

  onVisibleChange(value: boolean): void {
    this.visible.set(value);
    this.visibleChange.emit(value);
  }

  onShow(): void {
    queueMicrotask(() => this.focusFirstField());
  }

  onHide(): void {
    this.visible.set(false);
    this.visibleChange.emit(false);
    this.hide.emit();
  }

  private focusFirstField(): void {
    const root = this.host.nativeElement;
    const dialog = root.querySelector('.p-dialog') ?? root;
    const selector =
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), .p-inputtext:not([disabled]), .p-select';
    const el = dialog.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    const focusTarget =
      (el.querySelector('input:not([disabled]), [role="combobox"], [tabindex]') as HTMLElement | null) ??
      el;
    focusTarget.focus();
  }
}
