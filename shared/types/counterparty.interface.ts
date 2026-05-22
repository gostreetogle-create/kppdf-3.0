export type CounterpartyLegalForm = 'ООО' | 'ИП' | 'АО' | 'ПАО' | 'Физлицо' | 'Другое';
export type CounterpartyRole = 'client' | 'supplier' | 'company';

export interface ICounterparty {
  _id?: string;
  name: string;
  shortName?: string;
  legalForm: CounterpartyLegalForm;
  roles: CounterpartyRole[];
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
