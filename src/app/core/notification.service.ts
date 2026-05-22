import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

export type NotificationSeverity = 'success' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messageService = inject(MessageService);

  success(summary: string, detail?: string): void {
    this.show('success', summary, detail);
  }

  info(summary: string, detail?: string): void {
    this.show('info', summary, detail);
  }

  warn(summary: string, detail?: string): void {
    this.show('warn', summary, detail);
  }

  error(summary: string, detail?: string): void {
    this.show('error', summary, detail);
  }

  private show(severity: NotificationSeverity, summary: string, detail?: string): void {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }
}
