import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { UserRole } from './auth.service';

export interface ManagedUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
}

@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  private readonly baseUrl = `${environment.apiUrl}/admin/users`;

  constructor(private http: HttpClient) {}

  listUsers(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(this.baseUrl);
  }

  createUser(input: CreateUserInput): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(this.baseUrl, input);
  }

  updateRole(userId: string, role: UserRole): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.baseUrl}/${userId}/role`, { role });
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}`);
  }
}
