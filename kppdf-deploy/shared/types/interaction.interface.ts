export interface IInteraction {
  _id?: string;
  counterpartyId: string;
  type: string;
  description?: string;
  relatedTo?: object;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

