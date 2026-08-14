import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface ImportSummary {
  importedKeys: number;
  skippedKeys: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DataTransferApiService {
  constructor(private http: HttpClient) {}

  exportData(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${environment.apiUrl}/export`);
  }

  importData(payload: Record<string, unknown>): Observable<ImportSummary> {
    return this.http.post<ImportSummary>(`${environment.apiUrl}/import`, payload);
  }
}
