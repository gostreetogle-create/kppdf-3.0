import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface CrudQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  all?: boolean;
}

/**
 * Универсальный CRUD-сервис для любого API-пути.
 * Используется модулями: quotation, order, bom, operation, warehouse,
 * purchase-request, purchase-order, stock/movement, work-order, shipment и т.д.
 */
@Injectable({ providedIn: 'root' })
export class CrudApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  list<T>(basePath: string, query: CrudQuery = {}): Observable<PaginatedResponse<T>> {
    const params: Record<string, string | number> = {};
    if (query.page) params['page'] = query.page;
    if (query.limit) params['limit'] = query.limit;
    if (query.search) params['search'] = query.search;

    if (query.sort) params['sort'] = query.sort;
    if (query.order) params['order'] = query.order;
    if (query.all) params['all'] = 'true';

    return this.http.get<PaginatedResponse<T>>(`${this.apiBase}${basePath}`, { params });
  }

  getById<T>(basePath: string, id: string): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.apiBase}${basePath}/${id}`)
      .pipe(map((res) => res.data));
  }

  create<T>(basePath: string, body: Record<string, unknown>): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.apiBase}${basePath}`, body)
      .pipe(map((res) => res.data));
  }

  update<T>(basePath: string, id: string, body: Record<string, unknown>): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(`${this.apiBase}${basePath}/${id}`, body)
      .pipe(map((res) => res.data));
  }

  delete<T>(basePath: string, id: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(`${this.apiBase}${basePath}/${id}`)
      .pipe(map((res) => res.data));
  }
}
