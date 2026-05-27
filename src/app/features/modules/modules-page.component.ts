import { Component, signal, computed, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { MODULE_PERM_PREFIX } from '../../core/permissions';
import { CounterpartyOptionsService } from '../../shared/services/counterparty-options.service';
import { ProductOptionsService } from '../../shared/services/product-options.service';
import { OrderOptionsService } from '../../shared/services/order-options.service';
import { WarehouseOptionsService } from '../../shared/services/warehouse-options.service';
import { ShipmentOptionsService } from '../../shared/services/shipment-options.service';
import { WorkOrderOptionsService } from '../../shared/services/work-order-options.service';
import { OperationOptionsService } from '../../shared/services/operation-options.service';
import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import { KpButtonComponent, type KpSelectOption } from '../../shared/ui';
import type { CrudPermissions } from '../../shared/crud/crud-page.types';
import {
  MODULE_CONFIGS,
  DEPARTMENTS,
  MODULE_DEPT,
  MODULE_ENTITY_LABEL,
  buildModuleTableColumns,
  type ModuleConfig,
  type ModuleKey,
  type ColumnRef,
} from './modules.config';
import { createModuleStores, type ModuleStores } from './modules.store';
import { moduleSeverity } from './module-severity.util';
import { ModuleDynamicFormComponent } from './module-dynamic-form.component';

interface DepartmentGroup {
  id: string;
  label: string;
  icon: string;
  modules: ModuleConfig[];
}

function modulePermissions(key: ModuleKey): CrudPermissions {
  const prefix = MODULE_PERM_PREFIX[key] || 'office.';
  return {
    view: `${prefix}.view`,
    create: `${prefix}.create`,
    update: `${prefix}.edit`,
    delete: `${prefix}.delete`,
  };
}

@Component({
  selector: 'app-modules-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KpCrudPageComponent, KpButtonComponent, ModuleDynamicFormComponent],
  template: `
    <div class="page">
      <div class="page__header">
        <h1>Бизнес-процессы</h1>
      </div>

      @for (group of visibleGroups(); track group.id) {
        <div class="mod-dept">
          <div class="mod-dept__header">
            <i [class]="group.icon + ' mod-dept__icon'"></i>
            <span class="mod-dept__label">{{ group.label }}</span>
          </div>
          <div class="mod-dept__tabs">
            @for (mod of group.modules; track mod.key) {
              <app-kp-button
                [label]="mod.label"
                [icon]="mod.icon"
                [severity]="activeKey() === mod.key ? 'primary' : 'secondary'"
                [outlined]="activeKey() !== mod.key"
                (buttonClick)="selectModule(mod.key)"
                size="small"
                styleClass="mod-dept__btn"
              />
            }
          </div>
        </div>
      }

      @if (currentMod(); as mod) {
        <app-kp-crud-page
          [embedded]="true"
          [title]="mod.label"
          [entityLabel]="entityLabel(mod.key)"
          [store]="activeStore()"
          [columns]="tableColumns()"
          [permissions]="activePermissions()"
          [severityFn]="severityFn"
          [createLabel]="createLabel(mod.key)"
        >
          <ng-template #form let-row>
            <app-module-dynamic-form
              [columns]="mod.columns"
              [row]="row"
              [refOptions]="refOptions()"
              [refOptionsReady]="refOptionsReady()"
            />
          </ng-template>
        </app-kp-crud-page>
      }
    </div>
  `,
  styleUrl: './modules-page.component.scss',
})
export class ModulesPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly counterpartyOptionsService = inject(CounterpartyOptionsService);
  private readonly productOptionsService = inject(ProductOptionsService);
  private readonly orderOptionsService = inject(OrderOptionsService);
  private readonly warehouseOptionsService = inject(WarehouseOptionsService);
  private readonly shipmentOptionsService = inject(ShipmentOptionsService);
  private readonly workOrderOptionsService = inject(WorkOrderOptionsService);
  private readonly operationOptionsService = inject(OperationOptionsService);

  readonly stores: ModuleStores = createModuleStores(this.destroyRef);
  readonly modules = MODULE_CONFIGS;
  readonly severityFn = moduleSeverity;

  readonly activeKey = signal<ModuleKey>('boms');

  readonly refOptions = signal<Record<ColumnRef, KpSelectOption[]>>({
    counterparty: [],
    product: [],
    order: [],
    warehouse: [],
    shipment: [],
    workOrder: [],
    operation: [],
  });

  readonly refOptionsReady = signal(false);

  readonly visibleModules = computed(() =>
    this.modules.filter((m) => this.auth.hasPermission(`${MODULE_PERM_PREFIX[m.key] || 'office.'}.view`)),
  );

  readonly visibleGroups = computed<DepartmentGroup[]>(() => {
    const visible = this.visibleModules();
    return DEPARTMENTS
      .map((dept) => ({
        id: dept.id,
        label: dept.label,
        icon: dept.icon,
        modules: visible.filter((m) => MODULE_DEPT[m.key] === dept.id),
      }))
      .filter((g) => g.modules.length > 0);
  });

  readonly currentMod = computed(() =>
    this.modules.find((m) => m.key === this.activeKey()) ?? null,
  );

  readonly activeStore = computed(() => this.stores[this.activeKey()]);

  readonly activePermissions = computed(() => modulePermissions(this.activeKey()));

  readonly tableColumns = computed(() => {
    const mod = this.currentMod();
    if (!mod) return [];
    return buildModuleTableColumns(mod, this.refOptions());
  });

  ngOnInit(): void {
    const visible = this.visibleModules();
    if (visible.length && !visible.some((m) => m.key === this.activeKey())) {
      this.activeKey.set(visible[0].key);
    }

    forkJoin({
      counterparty: this.counterpartyOptionsService.load(),
      product: this.productOptionsService.load(),
      order: this.orderOptionsService.load(),
      warehouse: this.warehouseOptionsService.load(),
      shipment: this.shipmentOptionsService.load(),
      workOrder: this.workOrderOptionsService.load(),
      operation: this.operationOptionsService.load(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.refOptionsReady.set(true)),
      )
      .subscribe({
        next: (refs) => this.refOptions.set(refs),
        error: () => this.refOptionsReady.set(true),
      });
  }

  entityLabel(key: ModuleKey): string {
    return MODULE_ENTITY_LABEL[key];
  }

  createLabel(key: ModuleKey): string {
    const labels: Partial<Record<ModuleKey, string>> = {
      boms: 'Создать BOM',
      operations: 'Создать операцию',
      'tech-processes': 'Создать техпроцесс',
      'purchase-requests': 'Создать заявку',
      warehouses: 'Создать склад',
      'stock-movements': 'Создать движение',
      reservations: 'Создать резерв',
      'work-order-operations': 'Создать операцию наряда',
      'cost-calculations': 'Создать калькуляцию',
      'actual-costs': 'Добавить затраты',
      'shipping-docs': 'Создать документ',
      counters: 'Создать счётчик',
      interactions: 'Добавить запись',
    };
    return labels[key] ?? 'Создать';
  }

  selectModule(key: ModuleKey): void {
    if (this.activeKey() === key) return;
    this.activeKey.set(key);
    this.stores[key].setSearch('');
    this.stores[key].load();
  }
}
