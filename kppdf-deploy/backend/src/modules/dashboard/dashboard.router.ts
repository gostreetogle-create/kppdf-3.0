import { Router, Request, Response } from 'express';
import { ProductModel } from '../products/product.model';
import { CategoryModel } from '../categories/category.model';
import { CounterpartyModel } from '../counterparties/counterparty.model';
import { UserModel } from '../users/user.model';
import { RoleModel } from '../roles/role.model';
import { StatusModel } from '../statuses/status.model';
import { WorkTypeModel } from '../work-types/work-type.model';
import { SettingModel } from '../settings/setting.model';
import { QuotationModel } from '../quotations/quotation.model';
import { OrderModel } from '../orders/order.model';
import { BomModel } from '../boms/bom.model';
import { OperationModel } from '../operations/operation.model';
import { TechProcessModel } from '../tech-processes/techProcess.model';
import { PurchaseRequestModel } from '../purchase-requests/purchaseRequest.model';
import { PurchaseOrderModel } from '../purchase-orders/purchaseOrder.model';
import { WarehouseModel } from '../warehouses/warehouse.model';
import { StockMovementModel } from '../stock/stockMovement.model';
import { ReservationModel } from '../reservations/reservation.model';
import { WorkOrderModel } from '../work-orders/workOrder.model';
import { WorkOrderOperationModel } from '../work-order-operations/workOrderOperation.model';
import { CostCalculationModel } from '../cost/costCalculation.model';
import { ActualCostModel } from '../actual-costs/actualCost.model';
import { ShipmentModel } from '../shipments/shipment.model';
import { ShippingDocModel } from '../shipping-docs/shippingDoc.model';
import { CounterModel } from '../counters/counter.model';
import { InteractionModel } from '../interactions/interaction.model';
import { success, error } from '../../utils/api-response';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      products,
      categories,
      counterparties,
      users,
      roles,
      statuses,
      workTypes,
      settings,
      quotations,
      orders,
      boms,
      operations,
      techProcesses,
      purchaseRequests,
      purchaseOrders,
      warehouses,
      stockMovements,
      reservations,
      workOrders,
      workOrderOperations,
      costCalculations,
      actualCosts,
      shipments,
      shippingDocs,
      counters,
      interactions,
    ] = await Promise.all([
      ProductModel.countDocuments(),
      CategoryModel.countDocuments(),
      CounterpartyModel.countDocuments(),
      UserModel.countDocuments(),
      RoleModel.countDocuments(),
      StatusModel.countDocuments(),
      WorkTypeModel.countDocuments(),
      SettingModel.countDocuments(),
      QuotationModel.countDocuments(),
      OrderModel.countDocuments(),
      BomModel.countDocuments(),
      OperationModel.countDocuments(),
      TechProcessModel.countDocuments(),
      PurchaseRequestModel.countDocuments(),
      PurchaseOrderModel.countDocuments(),
      WarehouseModel.countDocuments(),
      StockMovementModel.countDocuments(),
      ReservationModel.countDocuments(),
      WorkOrderModel.countDocuments(),
      WorkOrderOperationModel.countDocuments(),
      CostCalculationModel.countDocuments(),
      ActualCostModel.countDocuments(),
      ShipmentModel.countDocuments(),
      ShippingDocModel.countDocuments(),
      CounterModel.countDocuments(),
      InteractionModel.countDocuments(),
    ]);

    const totalAll = products + categories + counterparties + users + roles +
      statuses + workTypes + settings + quotations + orders + boms +
      operations + techProcesses + purchaseRequests + purchaseOrders +
      warehouses + stockMovements + reservations + workOrders +
      workOrderOperations + costCalculations + actualCosts + shipments +
      shippingDocs + counters + interactions;

    res.json(success({
      products: { total: products, label: 'Товары', icon: 'pi pi-box', group: 'directory' },
      categories: { total: categories, label: 'Категории', icon: 'pi pi-sitemap', group: 'directory' },
      counterparties: { total: counterparties, label: 'Контрагенты', icon: 'pi pi-users', group: 'directory' },
      users: { total: users, label: 'Пользователи', icon: 'pi pi-user', group: 'directory' },
      roles: { total: roles, label: 'Роли', icon: 'pi pi-shield', group: 'directory' },
      statuses: { total: statuses, label: 'Статусы', icon: 'pi pi-tag', group: 'directory' },
      workTypes: { total: workTypes, label: 'Типы работ', icon: 'pi pi-wrench', group: 'directory' },
      settings: { total: settings, label: 'Настройки', icon: 'pi pi-cog', group: 'directory' },
      quotations: { total: quotations, label: 'КП', icon: 'pi pi-file-edit', group: 'crm' },
      orders: { total: orders, label: 'Заказы', icon: 'pi pi-shopping-cart', group: 'crm' },
      boms: { total: boms, label: 'Спецификации (BOM)', icon: 'pi pi-sitemap', group: 'plm' },
      operations: { total: operations, label: 'Операции', icon: 'pi pi-cog', group: 'plm' },
      techProcesses: { total: techProcesses, label: 'Техпроцессы', icon: 'pi pi-chart-scatter', group: 'plm' },
      purchaseRequests: { total: purchaseRequests, label: 'Заявки на закуп', icon: 'pi pi-send', group: 'purchase' },
      purchaseOrders: { total: purchaseOrders, label: 'Заказы поставщикам', icon: 'pi pi-truck', group: 'purchase' },
      warehouses: { total: warehouses, label: 'Склады', icon: 'pi pi-home', group: 'stock' },
      stockMovements: { total: stockMovements, label: 'Движения склада', icon: 'pi pi-arrow-right-arrow-left', group: 'stock' },
      reservations: { total: reservations, label: 'Резервы', icon: 'pi pi-lock', group: 'stock' },
      workOrders: { total: workOrders, label: 'Производ. наряды', icon: 'pi pi-wrench', group: 'production' },
      workOrderOperations: { total: workOrderOperations, label: 'Операции нарядов', icon: 'pi pi-list-check', group: 'production' },
      costCalculations: { total: costCalculations, label: 'Калькуляции', icon: 'pi pi-calculator', group: 'cost' },
      actualCosts: { total: actualCosts, label: 'Факт. затраты', icon: 'pi pi-money-bill', group: 'cost' },
      shipments: { total: shipments, label: 'Отгрузки', icon: 'pi pi-box', group: 'shipping' },
      shippingDocs: { total: shippingDocs, label: 'Отгруз. документы', icon: 'pi pi-file', group: 'shipping' },
      counters: { total: counters, label: 'Счётчики', icon: 'pi pi-hashtag', group: 'admin' },
      interactions: { total: interactions, label: 'Взаимодействия', icon: 'pi pi-comments', group: 'crm' },
      total: totalAll,
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json(error(message));
  }
});
