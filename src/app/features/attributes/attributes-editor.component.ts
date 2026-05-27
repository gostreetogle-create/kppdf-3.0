import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { NotificationService } from '../../core/notification.service';
import {
  KpButtonComponent,
  KpCheckboxComponent,
  KpDatepickerComponent,
  KpInputComponent,
  KpInputNumberComponent,
  KpMultiselectComponent,
  KpSelectComponent,
  KpTextareaComponent,
  type KpSelectOption,
} from '../../shared/ui';

interface AttributeField {
  _id: string;
  attributeId: string;
  name: string;
  label: string;
  type: string;
  unit?: string;
  options?: string[];
  required: boolean;
  sortOrder: number;
  value: unknown;
}

@Component({
  selector: 'app-attributes-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    KpButtonComponent,
    KpCheckboxComponent,
    KpDatepickerComponent,
    KpInputComponent,
    KpInputNumberComponent,
    KpMultiselectComponent,
    KpSelectComponent,
    KpTextareaComponent,
  ],
  templateUrl: './attributes-editor.component.html',
  styleUrl: './attributes-editor.component.scss',
})
export class AttributesEditorComponent implements OnInit, OnChanges {
  @Input() entityType!: string;
  @Input() entityId!: string;

  private readonly api = inject(ApiService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  attributes: AttributeField[] = [];
  loading = false;
  saving = false;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entityType'] || changes['entityId']) {
      if (this.entityType && this.entityId) {
        this.load();
      }
    }
  }

  toStr(value: unknown): string {
    return value == null ? '' : String(value);
  }

  toNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  toBool(value: unknown): boolean {
    return value === true || value === 'true';
  }

  toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  toSelectOptions(options?: string[]): KpSelectOption[] {
    return (options ?? []).map((o) => ({ label: o, value: o }));
  }

  setValue(attr: AttributeField, value: unknown): void {
    attr.value = value;
  }

  load(): void {
    if (!this.entityType || !this.entityId) return;

    this.loading = true;
    this.error = '';
    this.api
      .get<AttributeField[]>(`/attributes/values/${this.entityType}/${this.entityId}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.attributes = res.data ?? [];
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Ошибка загрузки атрибутов';
          this.loading = false;
          console.error(err);
        },
      });
  }

  save(): void {
    if (!this.entityType || !this.entityId) return;

    this.saving = true;
    const values = this.attributes.map((a) => ({
      attributeId: a.attributeId,
      value: a.value,
    }));

    this.api
      .putPayload(`/attributes/values/${this.entityType}/${this.entityId}`, { values })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success('Характеристики сохранены');
          this.saving = false;
        },
        error: (err) => {
          this.notification.error('Ошибка при сохранении характеристик');
          this.saving = false;
          console.error(err);
        },
      });
  }
}
