import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { API } from './env';

export interface AdminUser { id: string; name: string; email: string; role: string; }
interface TokenPair { accessToken: string; refreshToken: string; }

function safeLs(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private _token = signal<string | null>(safeLs('adm_token'));
  private _user = signal<AdminUser | null>(null);

  readonly isLoggedIn = computed(() => !!this._token());
  readonly currentUser = this._user.asReadonly();
  readonly token = this._token.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    if (this.isBrowser && this._token()) this.loadProfile();
  }

  login(email: string, password: string) {
    return this.http.post<TokenPair>(`${API}/auth/login`, { email, password })
      .pipe(tap(r => this.saveTokens(r)));
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem('adm_token');
    }
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  loadProfile() {
    this.http.get<AdminUser>(`${API}/users/me`).subscribe({
      next: u => {
        if (u.role !== 'admin') { this.logout(); return; }
        this._user.set(u);
      },
      error: () => this.logout(),
    });
  }

  private saveTokens(p: TokenPair) {
    if (this.isBrowser) {
      localStorage.setItem('adm_token', p.accessToken);
    }
    this._token.set(p.accessToken);
    this.loadProfile();
  }
}
