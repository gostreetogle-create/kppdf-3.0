import { Component, input, model, output, ChangeDetectionStrategy } from '@angular/core';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';

@Component({
  selector: 'app-kp-paginator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaginatorModule],
  template: `
    <p-paginator
      styleClass="kp-paginator"
      [first]="first()"
      [rows]="rows()"
      [totalRecords]="totalRecords()"
      [rowsPerPageOptions]="rowsPerPageOptions()"
      [showFirstLastIcon]="true"
      [showCurrentPageReport]="showCurrentPageReport()"
      [currentPageReportTemplate]="currentPageReportTemplate()"
      (onPageChange)="onPageChange($event)"
    />
  `,
  styleUrl: './kp-paginator.component.scss',
})
export class KpPaginatorComponent {
  /** Первый индекс текущей страницы (0-based). Двусторонний — p-paginator управляет сам. */
  readonly first = model(0);
  /** Строк на странице */
  readonly rows = input.required<number>();
  /** Всего записей */
  readonly totalRecords = input.required<number>();
  /** Варианты строк на странице */
  readonly rowsPerPageOptions = input<number[]>([10, 25, 50]);
  /** Показывать «Записи X–Y из Z» */
  readonly showCurrentPageReport = input(true);
  /** Шаблон отчёта о странице */
  readonly currentPageReportTemplate = input('Записи {first}–{last} из {totalRecords}');

  /** Событие смены страницы: { first, rows } */
  readonly pageChange = output<{ first: number; rows: number }>();

  onPageChange(event: PaginatorState): void {
    this.first.set(event.first ?? 0);
    const rows = event.rows ?? this.rows();
    this.pageChange.emit({ first: event.first ?? 0, rows });
  }
}
