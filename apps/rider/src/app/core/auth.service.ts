import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { API } from './env';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem('cr_token'));
  private _user = signal<User | null>(null);

  readonly isLoggedIn = computed(() => !!this._token());
  readonly currentUser = this._user.asReadonly();
  readonly token = this._token.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    if (this._token()) this.loadProfile();
  }

  register(name: string, email: string, phone: string, password: string) {
    return this.http.post<TokenPair>(`${API}/auth/register`, {
      name, email, phone, password, role: 'rider'
    }).pipe(tap(r => this.saveTokens(r)));
  }

  login(email: string, password: string) {
    return this.http.post<TokenPair>(`${API}/auth/login`, { email, password })
      .pipe(tap(r => this.saveTokens(r)));
  }

  logout() {
    localStorage.removeItem('cr_token');
    localStorage.removeItem('cr_refresh');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  loadProfile() {
    this.http.get<User>(`${API}/users/me`).subscribe({
      next: u => this._user.set(u),
      error: () => this.logout(),
    });
  }

  private saveTokens(pair: TokenPair) {
    localStorage.setItem('cr_token', pair.accessToken);
    localStorage.setItem('cr_refresh', pair.refreshToken);
    this._token.set(pair.accessToken);
    this.loadProfile();
  }
}
