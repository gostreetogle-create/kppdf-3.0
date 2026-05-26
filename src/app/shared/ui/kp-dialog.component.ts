import { Component, input, model, output, ChangeDetectionStrategy } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-kp-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [header]="header()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="dialogStyle()"
      (onHide)="onHide()"
    >
      <ng-content />
      <ng-template pTemplate="footer">
        <ng-content select="[kpDialogFooter]" />
      </ng-template>
    </p-dialog>
  `,
})
export class KpDialogComponent {
  readonly visible = model(false);
  readonly header = input('');
  readonly width = input('480px');
  readonly hide = output<void>();
  readonly visibleChange = output<boolean>();

  dialogStyle(): Record<string, string> {
    return { width: this.width(), maxWidth: '90vw' };
  }

  onVisibleChange(value: boolean): void {
    this.visible.set(value);
    this.visibleChange.emit(value);
  }

  onHide(): void {
    this.visible.set(false);
    this.visibleChange.emit(false);
    this.hide.emit();
  }
}
