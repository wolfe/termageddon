import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Define the interfaces for the data models.
// These should match the Django serializers.
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export interface Domain {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by: User;
  updated_by: User;
}

export interface Term {
  id: number;
  text: string;
  created_at: string;
  updated_at: string;
  created_by: User;
  updated_by: User;
}

export interface Definition {
  id: number;
  definition_text: string;
  status: 'proposed' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  term: Term;
  domain: Domain;
  created_by: User;
  updated_by: User;
  approvers: User[];
}

// Interface for paginated API responses
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root'
})
export class GlossaryService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) { }

  // Generic fetch function for all models
  private get<T>(endpoint: string, params: HttpParams = new HttpParams()): Observable<PaginatedResponse<T>> {
    return this.http.get<PaginatedResponse<T>>(`${this.apiUrl}/${endpoint}/`, { params });
  }

  // --- Domain Methods ---
  getDomains(page: number = 1, search: string = ''): Observable<PaginatedResponse<Domain>> {
    let params = new HttpParams().set('page', page.toString());
    if (search) {
      params = params.set('search', search);
    }
    return this.get<Domain>('domains', params);
  }

  // --- Term Methods ---
  getTerms(page: number = 1, search: string = ''): Observable<PaginatedResponse<Term>> {
    let params = new HttpParams().set('page', page.toString());
    if (search) {
      params = params.set('search', search);
    }
    return this.get<Term>('terms', params);
  }

  getTerm(id: number): Observable<Term> {
    return this.http.get<Term>(`${this.apiUrl}/terms/${id}/`);
  }

  // --- Definition Methods ---
  getDefinitions(page: number = 1, filters: { [key: string]: string } = {}): Observable<PaginatedResponse<Definition>> {
    let params = new HttpParams().set('page', page.toString());
    for (const key in filters) {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    }
    return this.get<Definition>('definitions', params);
  }

  getDefinition(id: number): Observable<Definition> {
    return this.http.get<Definition>(`${this.apiUrl}/definitions/${id}/`);
  }

  createDefinition(data: Partial<Definition>): Observable<Definition> {
    return this.http.post<Definition>(`${this.apiUrl}/definitions/`, data);
  }

  updateDefinition(id: number, data: Partial<Definition>): Observable<Definition> {
    return this.http.put<Definition>(`${this.apiUrl}/definitions/${id}/`, data);
  }
  
  approveDefinition(id: number): Observable<Definition> {
    return this.http.post<Definition>(`${this.apiUrl}/definitions/${id}/approve/`, {});
  }
} 