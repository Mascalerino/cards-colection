import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface BackendSale {
  id: string;
  userId: string;
  setId: string;
  cardId: string | null;
  cardName: string | null;
  collectorNumber: string | null;
  language: string | null;
  condition: string | null;
  variant: string | null;
  quantity: number;
  pricePerUnit: string;
  totalPrice: string;
  saleDate: string;
}

export interface CreateSaleInput {
  setId: string;
  cardExternalId?: string | null;
  cardName: string;
  collectorNumber?: string | null;
  language?: string | null;
  condition?: string | null;
  variant?: string | null;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  saleDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class SalesApiService {
  private readonly baseUrl = `${environment.apiUrl}/magic/sales`;

  constructor(private http: HttpClient) {}

  listSales(setId: string): Observable<BackendSale[]> {
    return this.http.get<BackendSale[]>(`${this.baseUrl}/${setId}`);
  }

  createSale(input: CreateSaleInput): Observable<BackendSale> {
    return this.http.post<BackendSale>(this.baseUrl, input);
  }

  deleteSale(saleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${saleId}`);
  }
}
