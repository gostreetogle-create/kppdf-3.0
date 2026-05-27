export interface IShippingDoc {
  _id?: string;
  number: string;
  date?: string;
  type: string;
  shipmentId: string;
  totalAmount?: number;
  signatures?: object;
  pdfUrl?: string;
  // items: [{ productId: string, qty: Number, price: Number, tot...
  createdAt?: string;
  updatedAt?: string;
}

