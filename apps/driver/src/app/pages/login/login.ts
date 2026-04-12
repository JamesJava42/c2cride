import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="card">
        <h2>Driver Login</h2>
        <p class="hint" style="margin-bottom:0.75rem">
          Sign in with your <strong>driver</strong> account.
          Rider accounts will not work here.
        </p>
        <form (ngSubmit)="submit()">
          <label>Email</label>
          <input [(ngModel)]="email" name="email" type="email" placeholder="driver@email.com" required />
          <label>Password</label>
          <input [(ngModel)]="password" name="password" type="password" placeholder="Password" required />
          <button type="submit" [disabled]="loading()">{{ loading() ? 'Signing in…' : 'Sign In' }}</button>
        </form>
        @if (error()) { <p class="error">{{ error() }}</p> }
        @if (auth.wrongRoleError()) { <p class="error">{{ auth.wrongRoleError() }}</p> }
        <p class="link">New driver? <a routerLink="/register">Register here</a></p>
      </div>
    </div>
  `,
})
export class LoginPage {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(public auth: AuthService, private router: Router) {
    // Clear any stale wrong-role error when navigating back to login
    this.auth.wrongRoleError.set('');
  }

  submit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.wrongRoleError.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: e => {
        this.error.set(e.error?.message ?? 'Login failed. Check your email and password.');
        this.loading.set(false);
      },
    });
  }
}
