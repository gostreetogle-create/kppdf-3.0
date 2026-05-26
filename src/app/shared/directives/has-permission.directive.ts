import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private requiredPermission = '';
  private hasView = false;

  constructor() {
    // Реактивно следим за изменением permissions
    effect(() => {
      // Читаем сигнал, чтобы подписаться на изменения
      this.auth.permissions();
      this.updateView();
    });
  }

  @Input() set appHasPermission(permission: string) {
    this.requiredPermission = permission;
    this.updateView();
  }

  private updateView(): void {
    const hasAccess = this.auth.hasPermission(this.requiredPermission);
    if (hasAccess && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
