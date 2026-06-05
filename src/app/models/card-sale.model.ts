import { CardLanguage, CardCondition } from './card-entry.model';

export interface CardSale {
  id: string; // ID único de la venta
  cardId: string;
  cardName: string;
  collectorNumber: string;
  language: CardLanguage;
  condition: CardCondition;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  saleDate: string; // ISO date string
  variant: 'foil' | 'nonfoil';
}

export interface SetSalesData {
  setId: string;
  sales: CardSale[];
}
