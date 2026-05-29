// ============================================================
// KPPDF 3.0 — Golden Samples
// Эталонные паттерны UI-компонентов.
// ИИ ОБЯЗАН использовать их один-в-один.
// Запрещено создавать свои варианты без согласования.
// ============================================================

// ============================================================
// SAMPLE 1: TableWithPagination
// Эталонная таблица через app-kp-table + app-kp-crud-page
// ============================================================
//
// <!-- ===== Template (внутри app-kp-crud-page) ===== -->
// <app-kp-crud-page
//   [config]="{
//     title: 'Товары',
//     entityLabel: 'товара',
//     apiPath: '/api/v1/products',
//     permPrefix: 'products',
//     columns: [
//       { field: 'name', header: 'Наименование', type: 'text' },
//       { field: 'sku', header: 'Артикул', type: 'text', width: '120px' },
//       { field: 'categoryId', header: 'Категория', type: 'select', options: categoryOptions },
//       { field: 'status', header: 'Статус', type: 'tag', options: statusOptions, sortable: true },
//       { field: 'listPrice', header: 'Цена', type: 'number', width: '100px' },
//     ],
//     severityFn: (val: unknown) => {
//       const map: Record<string, string> = { 'active': 'success', 'draft': 'warn', 'archived': 'secondary' };
//       return map[String(val)] ?? 'info';
//     },
//     dialogFields: [
//       { field: 'name', label: 'Наименование', type: 'text', required: true },
//       { field: 'sku', label: 'Артикул', type: 'text', required: true },
//       { field: 'categoryId', label: 'Категория', type: 'select', options: categoryOptions, required: true },
//       { field: 'listPrice', label: 'Цена', type: 'number' },
//     ],
//     extraRowActions: [...],
//   }"
//   (rowEdit)="onEdit($event)"
//   (rowDelete)="onDelete($event)"
// />

// ============================================================
// SAMPLE 2: Buttons (app-kp-button)
// ============================================================
//
// <!-- Primary CTA (default premium) -->
// <app-kp-button
//   label="Создать товар"
//   icon="pi pi-plus"
//   size="small"
//   (buttonClick)="openCreate()"
// />
//
// <!-- Secondary outlined (Cancel in dialog) -->
// <app-kp-button
//   label="Отмена"
//   severity="secondary"
//   size="small"
//   [outlined]="true"
//   (buttonClick)="closeDialog()"
// />
//
// <!-- Danger (Delete confirmation) -->
// <app-kp-button
//   label="Удалить"
//   severity="danger"
//   size="small"
//   (buttonClick)="confirmDelete()"
// />
//
// <!-- Icon-only edit (table row actions) -->
// <app-kp-button
//   icon="pi pi-pencil"
//   [rounded]="true"
//   [text]="true"
//   severity="secondary"
//   variant="flat"
//   size="small"
//   tooltip="Редактировать"
//   (buttonClick)="edit.emit(row)"
// />
//
// <!-- Icon-only delete (table row actions) -->
// <app-kp-button
//   icon="pi pi-trash"
//   [rounded]="true"
//   [text]="true"
//   severity="danger"
//   variant="flat"
//   size="small"
//   tooltip="Удалить"
//   (buttonClick)="deleteRow.emit(row)"
// />

// ============================================================
// SAMPLE 3: Search (app-kp-search)
// ============================================================
//
// <!-- В тулбаре таблицы -->
// <app-kp-search
//   [(query)]="searchQuery"
//   placeholder="Поиск..."
//   [debounceMs]="300"
//   (searchChange)="onSearch($event)"
// />

// ============================================================
// SAMPLE 4: Tags (app-kp-tag)
// ============================================================
//
// <!-- Статус тегом -->
// <app-kp-tag
//   [value]="statusLabel"
//   [severity]="severityMap[status]"
// />
//
// <!-- severityMap пример -->
// const severityMap: Record<string, KpTagSeverity> = {
//   'completed': 'success',
//   'sent': 'warn',
//   'confirmed': 'info',
//   'pending': 'secondary',
//   'error': 'danger',
// };

// ============================================================
// SAMPLE 5: Tab Group (app-kp-tab-group)
// ============================================================
//
// <app-kp-tab-group
//   [options]="[
//     { label: 'Товары', value: 'products' },
//     { label: 'Категории', value: 'categories' },
//     { label: 'Контрагенты', value: 'counterparties' },
//   ]"
//   [(activeTab)]="currentTab"
//   ariaLabel="Разделы справочника"
// />
//
// <!-- Использование activeTab -->
// @switch (currentTab()) {
//   @case ('products') { ... }
//   @case ('categories') { ... }
//   @case ('counterparties') { ... }
// }

// ============================================================
// SAMPLE 6: CrudDialog (app-kp-dialog)
// ============================================================
//
// <!-- ===== Template ===== -->
// <app-kp-dialog
//   [(visible)]="dialogVisible"
//   [header]="dialogTitle"
//   [width]="'520px'"
//   (hide)="closeDialog()"
// >
//   <div class="dialog-form">
//     <div *ngFor="let field of fields" class="dialog-form__field">
//       <label>
//         {{ field.label }}
//         <span *ngIf="field.required" class="dialog-form__required">*</span>
//       </label>
//       <app-kp-input
//         *ngIf="field.type === 'text'"
//         [name]="field.key"
//         [(value)]="editRow[field.key]"
//         [required]="field.required"
//       />
//       <app-kp-input-number
//         *ngIf="field.type === 'number'"
//         [(value)]="editRow[field.key]"
//       />
//       <app-kp-select
//         *ngIf="field.type === 'select'"
//         [name]="field.key"
//         [options]="field.options || []"
//         [(value)]="editRow[field.key]"
//         [placeholder]="'Выберите...'"
//       />
//     </div>
//   </div>
//   <div kpDialogFooter>
//     <app-kp-button
//       label="Отмена"
//       severity="secondary"
//       size="small"
//       [outlined]="true"
//       (buttonClick)="closeDialog()"
//     />
//     <app-kp-button
//       label="Сохранить"
//       size="small"
//       [loading]="saving()"
//       (buttonClick)="save()"
//     />
//   </div>
// </app-kp-dialog>
//
// <!-- ===== SCSS ===== -->
// .dialog-form {
//   display: flex;
//   flex-direction: column;
//   gap: 18px;
//   padding: 4px 0;
//   &__field {
//     display: flex;
//     flex-direction: column;
//     gap: 6px;
//     label {
//       font-size: 13px;
//       font-weight: 500;
//       color: var(--kp-text-secondary);
//     }
//   }
// }
