import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-kp-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogModule],
  template: `
    <p-confirmDialog
      icon="pi pi-exclamation-triangle"
      acceptButtonStyleClass="p-button-danger"
      rejectButtonStyleClass="p-button-secondary p-button-outlined"
      acceptLabel="Подтвердить"
      rejectLabel="Отмена"
    />
  `,
})
export class KpConfirmDialogComponent {}
