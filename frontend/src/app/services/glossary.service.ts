import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  getDomains(): Observable<Domain[]> {
    return this.http.get<Domain[]>(`${this.apiUrl}domains/`);
  }

  getTerms(): Observable<Term[]> {
    return this.http.get<Term[]>(`${this.apiUrl}terms/`);
  }

  getDefinitions(): Observable<Definition[]> {
    return this.http.get<Definition[]>(`${this.apiUrl}definitions/`);
  }
}
