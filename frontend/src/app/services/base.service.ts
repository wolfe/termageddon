import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root',
})
export abstract class BaseService {
  protected readonly API_URL = 'http://localhost:8000/api';

  constructor(protected http: HttpClient) {}

  /**
   * Build HTTP parameters from a filter object
   */
  protected buildParams(filters?: any): HttpParams {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return params;
  }

  /**
   * Generic GET request with pagination support
   */
  protected getPaginated<T>(endpoint: string, filters?: any): Observable<PaginatedResponse<T>> {
    const params = this.buildParams(filters);
    return this.http.get<PaginatedResponse<T>>(`${this.API_URL}${endpoint}`, {
      params,
    });
  }

  /**
   * Generic GET request for single item
   */
  protected get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.API_URL}${endpoint}`);
  }

  /**
   * Generic POST request
   */
  protected post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.API_URL}${endpoint}`, data);
  }

  /**
   * Generic PATCH request
   */
  protected patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.API_URL}${endpoint}`, data);
  }

  /**
   * Generic PUT request
   */
  protected put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.API_URL}${endpoint}`, data);
  }

  /**
   * Generic DELETE request
   */
  protected delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.API_URL}${endpoint}`);
  }

  /**
   * Generic POST action request (for actions that don't require data)
   */
  protected postAction<T>(endpoint: string): Observable<T> {
    return this.http.post<T>(`${this.API_URL}${endpoint}`, {});
  }
}