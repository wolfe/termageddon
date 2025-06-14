import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Domain {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  created_by: number;
  updated_by: number;
}

export interface Term {
  id: number;
  text: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  created_by: number;
  updated_by: number;
}

export interface Definition {
  id: number;
  definition_text: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  term: Term;
  domain: Domain;
  created_by: number;
  updated_by: number;
  approvers: number[];
}

@Injectable({
  providedIn: 'root'
})
export class GlossaryService {
  private apiUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) { }

  getDomains(params: HttpParams = new HttpParams()): Observable<PaginatedResponse<Domain>> {
    return this.http.get<PaginatedResponse<Domain>>(`${this.apiUrl}domains/`, { params });
  }

  getTerms(params: HttpParams = new HttpParams()): Observable<PaginatedResponse<Term>> {
    return this.http.get<PaginatedResponse<Term>>(`${this.apiUrl}terms/`, { params });
  }

  getDefinitions(params: HttpParams = new HttpParams()): Observable<PaginatedResponse<Definition>> {
    return this.http.get<PaginatedResponse<Definition>>(`${this.apiUrl}definitions/`, { params });
  }

  createDefinition(data: { term: string; domain: string; definition_text: string }): Observable<Definition> {
    return this.http.post<Definition>(`${this.apiUrl}definitions/`, data);
  }

  approveDefinition(id: number): Observable<Definition> {
    return this.http.post<Definition>(`${this.apiUrl}definitions/${id}/approve/`, {});
  }
}
