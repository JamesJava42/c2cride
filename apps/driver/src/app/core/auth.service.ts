import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { API } from './env';

export interface DriverUser {
  id: string; name: string; email: string; phone: string; role: string; status: string;
}
interface TokenPair { accessToken: string; refreshToken: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem('drv_token'));
  private _user = signal<DriverUser | null>(null);
  /** Set when login succeeds but the account is not a driver role */
  readonly wrongRoleError = signal('');

  readonly isLoggedIn = computed(() => !!this._token());
  readonly currentUser = this._user.asReadonly();
  readonly token = this._token.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    if (this._token()) this.loadProfile();
  }

  register(name: string, email: string, phone: string, password: string) {
    return this.http.post<TokenPair>(`${API}/auth/register`, {
      name, email, phone, password, role: 'driver',
    }).pipe(tap(r => this.saveTokens(r)));
  }

  login(email: string, password: string) {
    return this.http.post<TokenPair>(`${API}/auth/login`, { email, password })
      .pipe(tap(r => this.saveTokens(r)));
  }

  logout() {
    localStorage.removeItem('drv_token');
    localStorage.removeItem('drv_refresh');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  loadProfile() {
    this.http.get<DriverUser>(`${API}/users/me`).subscribe({
      next: u => {
        if (u.role !== 'driver') {
          // Wrong account type — clear tokens and force re-login
          this.wrongRoleError.set(
            `This account is registered as a "${u.role}". Use the Driver app only with a driver account.`
          );
          localStorage.removeItem('drv_token');
          localStorage.removeItem('drv_refresh');
          this._token.set(null);
          this._user.set(null);
          this.router.navigate(['/login']);
          return;
        }
        this._user.set(u);
      },
      error: () => this.logout(),
    });
  }

  private saveTokens(p: TokenPair) {
    localStorage.setItem('drv_token', p.accessToken);
    localStorage.setItem('drv_refresh', p.refreshToken);
    this._token.set(p.accessToken);
    this.loadProfile();
  }
}
