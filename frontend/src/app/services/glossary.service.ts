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

@Injectable({
  providedIn: 'root'
})
export class GlossaryService {
  private apiUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) { }

  getDomains(): Observable<Domain[]> {
    return this.http.get<Domain[]>(`${this.apiUrl}domains/`);
  }
}
