// ============================================================
// KPPDF 3.0 — Golden Samples
// Эталонные паттерны UI-компонентов.
// ИИ ОБЯЗАН использовать их один-в-один.
// Запрещено создавать свои варианты без согласования.
// ============================================================

// ============================================================
// SAMPLE 1: TableWithPagination
// Эталонная таблица со striped, пагинатором, тэгами, action-колонкой
// ============================================================
//
// <!-- ===== Template ===== -->
// <p-table
//   [value]="rows()"
//   [paginator]="true"
//   [rows]="limit()"
//   [totalRecords]="totalRecords()"
//   [lazy]="true"
//   (onPage)="onPageChange($event)"
//   size="small"
//   styleClass="p-datatable-striped"
//   [showCurrentPageReport]="true"
//   currentPageReportTemplate="Записи {first}–{last} из {totalRecords}"
// >
//   <ng-template pTemplate="header">
//     <tr>
//       <th *ngFor="let col of columns" [style.width]="col.width">{{ col.header }}</th>
//       <th style="width:90px">Действия</th>
//     </tr>
//   </ng-template>
//   <ng-template pTemplate="body" let-row>
//     <tr>
//       <td *ngFor="let col of columns">
//         <ng-container [ngSwitch]="col.type">
//           <p-tag
//             *ngSwitchCase="'tag'"
//             [value]="row[col.field]"
//             [severity]="getSeverity(row[col.field])"
//           />
//           <span *ngSwitchDefault>{{ row[col.field] }}</span>
//         </ng-container>
//       </td>
//       <td>
//         <div class="dir-actions">
//           <p-button
//             icon="pi pi-pencil"
//             severity="secondary"
//             size="small"
//             (click)="showEdit(row)"
//             pTooltip="Редактировать"
//           />
//           <p-button
//             icon="pi pi-trash"
//             severity="danger"
//             size="small"
//             (click)="confirmDelete(row)"
//             pTooltip="Удалить"
//           />
//         </div>
//       </td>
//     </tr>
//   </ng-template>
//   <ng-template pTemplate="emptymessage">
//     <tr>
//       <td [attr.colspan]="columns.length + 1" class="dir-empty">
//         <i class="pi pi-inbox dir-empty__icon"></i>
//         <div class="dir-empty__text">Нет данных. Нажмите «Добавить» чтобы создать запись.</div>
//       </td>
//     </tr>
//   </ng-template>
// </p-table>
//
// <!-- ===== SCSS (override inside ::ng-deep) ===== -->
// /* Zebra: even rows background */
// .p-datatable-striped .p-datatable-tbody > tr:nth-child(even) {
//   background: #FAFBFC;
//   &:hover { background: #F3F4F6; }
// }
// /* Action buttons: icon-only compact */
// .p-button.p-button-sm.p-button-icon-only {
//   padding: 0.35rem !important;
//   width: 30px;
//   height: 30px;
//   &.p-button-secondary {
//     background: transparent !important;
//     border: transparent !important;
//     color: #6B7280 !important;
//     &:hover { background: #F3F4F6 !important; color: #374151 !important; }
//   }
//   &.p-button-danger {
//     background: transparent !important;
//     border: transparent !important;
//     color: #9CA3AF !important;
//     &:hover { background: #FEF2F2 !important; color: #DC2626 !important; }
//   }
// }
// /* Tag compact */
// .p-tag {
//   font-size: 11.5px;
//   font-weight: 500;
//   padding: 0.15rem 0.6rem;
//   border-radius: 999px;
// }

// ============================================================
// SAMPLE 2: CrudDialog
// Эталонный диалог создания/редактирования с формой
// ============================================================
//
// <!-- ===== Template ===== -->
// <p-dialog
//   [(visible)]="dialogVisible"
//   [header]="dialogTitle"
//   [modal]="true"
//   [style]="{ width: '520px' }"
//   (onHide)="closeDialog()"
//   [draggable]="false"
// >
//   <div class="dialog-form">
//     <div *ngFor="let field of fields" class="dialog-form__field">
//       <label>
//         {{ field.label }}
//         <span *ngIf="field.required" class="dialog-form__required">*</span>
//       </label>
//       <input
//         *ngIf="field.type === 'text'"
//         pInputText
//         [(ngModel)]="editRow[field.key]"
//         style="width:100%"
//       />
//       <p-inputNumber
//         *ngIf="field.type === 'number'"
//         [(ngModel)]="editRow[field.key]"
//         style="width:100%"
//       />
//       <p-select
//         *ngIf="field.type === 'select'"
//         [options]="field.options || []"
//         [(ngModel)]="editRow[field.key]"
//         optionLabel="label"
//         optionValue="value"
//         placeholder="Выберите..."
//         [showClear]="!field.required"
//         style="width:100%"
//       />
//     </div>
//   </div>
//   <ng-template pTemplate="footer">
//     <p-button
//       label="Отмена"
//       severity="secondary"
//       size="small"
//       (click)="closeDialog()"
//       [disabled]="saving()"
//     />
//     <p-button
//       label="Сохранить"
//       size="small"
//       (click)="save()"
//       [loading]="saving()"
//     />
//   </ng-template>
// </p-dialog>
//
// <!-- ===== SCSS (inside ::ng-deep) ===== -->
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
//       color: #6B7280;
//     }
//     .p-inputtext,
//     .p-inputnumber,
//     .p-select { width: 100%; }
//     .p-inputtext {
//       padding: 0.45rem 0.75rem;
//       font-size: 13.5px;
//       border-radius: 8px;
//     }
//     .p-inputnumber .p-inputnumber-input {
//       padding: 0.45rem 0.75rem;
//       font-size: 13.5px;
//       border-radius: 8px;
//       width: 100%;
//     }
//     .p-select {
//       border-radius: 8px;
//       font-size: 13.5px;
//       min-height: 38px;
//       .p-select-label {
//         padding: 0.4rem 0.75rem;
//         font-size: 13.5px;
//       }
//     }
//   }
// }
// .p-dialog-footer {
//   padding: 0.75rem 1.5rem 1.25rem !important;
//   gap: 8px;
//   .p-button {
//     padding: 0.45rem 1rem !important;
//     font-size: 13px !important;
//     border-radius: 8px !important;
//   }
// }
