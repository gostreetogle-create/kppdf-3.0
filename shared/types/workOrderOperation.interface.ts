export interface IWorkOrderOperation {
  _id?: string;
  workOrderId: string;
  operationId: string;
  order?: number;
  plannedDuration?: number;
  actualDuration?: number;
  statusId?: string;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

