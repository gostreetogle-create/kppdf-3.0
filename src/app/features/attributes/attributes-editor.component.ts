import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ApiService } from '../../core/api.service';
import { NotificationService } from '../../core/notification.service';

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
  imports: [CommonModule, FormsModule, ButtonModule, CheckboxModule, SelectModule, MultiSelectModule],
  template: `
    <div class="attributes-editor">
      <h3 class="attributes-editor__title">Характеристики</h3>

      <div *ngIf="loading" class="attributes-editor__loading">Загрузка...</div>

      <div *ngIf="error" class="attributes-editor__error">{{ error }}</div>

      <div *ngIf="!loading && attributes.length === 0" class="attributes-editor__empty">
        Нет дополнительных характеристик для этой сущности
      </div>

      <div *ngIf="!loading && attributes.length > 0" class="attributes-editor__grid">
        <div *ngFor="let attr of attributes" class="attributes-editor__field">
          <label class="attributes-editor__label" [attr.for]="attr.name">
            {{ attr.label }}
            <span *ngIf="attr.required" class="attributes-editor__required">*</span>
            <span *ngIf="attr.unit" class="attributes-editor__unit">({{ attr.unit }})</span>
          </label>

          <!-- String / text -->
          <input
            *ngIf="attr.type === 'string' || attr.type === 'text'"
            [id]="attr.name"
            class="attributes-editor__input"
            [(ngModel)]="attr.value"
            [required]="attr.required"
          />

          <!-- Number -->
          <input
            *ngIf="attr.type === 'number'"
            [id]="attr.name"
            type="number"
            class="attributes-editor__input"
            [(ngModel)]="attr.value"
            [required]="attr.required"
          />

          <!-- Boolean -->
          <p-checkbox
            *ngIf="attr.type === 'boolean'"
            [inputId]="attr.name"
            [(ngModel)]="attr.value"
            [binary]="true"
          />

          <!-- Date -->
          <input
            *ngIf="attr.type === 'date'"
            [id]="attr.name"
            type="date"
            class="attributes-editor__input"
            [(ngModel)]="attr.value"
          />

          <!-- Select -->
          <p-select
            *ngIf="attr.type === 'select'"
            [inputId]="attr.name"
            [options]="attr.options || []"
            [(ngModel)]="attr.value"
            [placeholder]="'Выберите...'"
            styleClass="attributes-editor__select"
          />

          <!-- Multiselect -->
          <p-multiselect
            *ngIf="attr.type === 'multiselect'"
            [inputId]="attr.name"
            [options]="attr.options || []"
            [(ngModel)]="attr.value"
            [placeholder]="'Выберите...'"
            styleClass="attributes-editor__multiselect"
            display="chip"
          />
        </div>
      </div>

      <div *ngIf="!loading && attributes.length > 0" class="attributes-editor__actions">
        <p-button
          label="Сохранить"
          icon="pi pi-check"
          (click)="save()"
          [disabled]="saving"
        />
        <p-button
          label="Сбросить"
          icon="pi pi-refresh"
          severity="secondary"
          (click)="load()"
          [disabled]="saving"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .attributes-editor {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        border-radius: 8px;
        padding: 1.25rem;
      }

      .attributes-editor__title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 1rem;
        color: var(--p-text-color);
      }

      .attributes-editor__loading,
      .attributes-editor__empty {
        color: var(--p-text-muted-color);
        font-size: 0.875rem;
        padding: 1rem 0;
      }

      .attributes-editor__error {
        color: var(--p-red-500);
        font-size: 0.875rem;
        padding: 0.5rem 0;
      }

      .attributes-editor__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
      }

      .attributes-editor__field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .attributes-editor__label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--p-text-color);
      }

      .attributes-editor__required {
        color: var(--p-red-500);
      }

      .attributes-editor__unit {
        color: var(--p-text-muted-color);
        font-weight: 400;
      }

      .attributes-editor__input {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--p-content-border-color);
        border-radius: 6px;
        font-size: 0.875rem;
        background: var(--p-form-field-background);
        color: var(--p-text-color);
        transition: border-color 0.15s;
      }

      .attributes-editor__input:focus {
        outline: none;
        border-color: var(--p-primary-color);
      }

      .attributes-editor__select,
      .attributes-editor__multiselect {
        width: 100%;
      }

      .attributes-editor__actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px solid var(--p-content-border-color);
      }
    `,
  ],
})
export class AttributesEditorComponent implements OnInit, OnChanges {
  @Input() entityType!: string;
  @Input() entityId!: string;

  private api = inject(ApiService);
  private notification = inject(NotificationService);

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

  load(): void {
    if (!this.entityType || !this.entityId) return;

    this.loading = true;
    this.error = '';
    this.api
      .get<AttributeField[]>(`/attributes/values/${this.entityType}/${this.entityId}`)
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
      .put(`/attributes/values/${this.entityType}/${this.entityId}`, { values })
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
