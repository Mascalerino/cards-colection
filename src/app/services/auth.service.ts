import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';

export interface AuthUser {
  id: string;
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** Usuario autenticado actual, o null. Se rellena tras login()/me(). */
  readonly currentUser = signal<AuthUser | null>(null);

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.baseUrl}/login`, { username, password }, { withCredentials: true })
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.currentUser.set(null)));
  }

  /** Comprueba si hay sesión activa (cookie válida) contra el backend. */
  me(): Observable<AuthUser> {
    return this.http
      .get<AuthUser>(`${this.baseUrl}/me`, { withCredentials: true })
      .pipe(tap((user) => this.currentUser.set(user)));
  }
}
