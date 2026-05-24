import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import type { PaginatedResponse } from './api.service';

export interface DirectoryQuery {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/directories`;

  /**
   * Generic GET list with pagination
   */
  list<T>(entity: string, query: DirectoryQuery = {}): Observable<PaginatedResponse<T>> {
    const params: Record<string, string | number> = {};
    if (query.page) params['page'] = query.page;
    if (query.limit) params['limit'] = query.limit;
    if (query.search) params['search'] = query.search;

    return this.http.get<PaginatedResponse<T>>(`${this.baseUrl}/${entity}`, { params });
  }

  /**
   * Generic GET by id
   */
  getById<T>(entity: string, id: string): Observable<T> {
    return this.http
      .get<{ success: boolean; data: T }>(`${this.baseUrl}/${entity}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Generic CREATE
   */
  create<T>(entity: string, body: Record<string, unknown>): Observable<T> {
    return this.http
      .post<{ success: boolean; data: T }>(`${this.baseUrl}/${entity}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Generic UPDATE
   */
  update<T>(entity: string, id: string, body: Record<string, unknown>): Observable<T> {
    return this.http
      .put<{ success: boolean; data: T }>(`${this.baseUrl}/${entity}/${id}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Generic DELETE
   */
  delete<T>(entity: string, id: string): Observable<T> {
    return this.http
      .delete<{ success: boolean; data: T }>(`${this.baseUrl}/${entity}/${id}`)
      .pipe(map((res) => res.data));
  }
}
