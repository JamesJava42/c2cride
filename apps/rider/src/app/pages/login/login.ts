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
        <h2>Rider Login</h2>
        <form (ngSubmit)="submit()">
          <input [(ngModel)]="email" name="email" type="email" placeholder="Email" required />
          <input [(ngModel)]="password" name="password" type="password" placeholder="Password" required />
          <button type="submit" [disabled]="loading()">{{ loading() ? 'Signing in…' : 'Sign In' }}</button>
        </form>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <p class="link">No account? <a routerLink="/register">Register</a></p>
      </div>
    </div>
  `,
})
export class LoginPage {
  email = ''; password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.loading.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/home']),
      error: e => { this.error.set(e.error?.message ?? 'Login failed'); this.loading.set(false); },
    });
  }
}
