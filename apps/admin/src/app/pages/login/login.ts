import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth-wrap">
      <div class="card">
        <h2>Admin Portal</h2>
        <form (ngSubmit)="submit()">
          <input [(ngModel)]="email" name="email" type="email" placeholder="Admin email" required />
          <input [(ngModel)]="password" name="password" type="password" placeholder="Password" required />
          <button type="submit" [disabled]="loading()">{{ loading() ? 'Signing in…' : 'Sign In' }}</button>
        </form>
        @if (error()) { <p class="error">{{ error() }}</p> }
      </div>
    </div>
  `,
})
export class LoginPage {
  email = ''; password = '';
  loading = signal(false); error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.loading.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: e => { this.error.set(e.error?.message ?? 'Login failed'); this.loading.set(false); },
    });
  }
}
