import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="card">
        <h2>Create Rider Account</h2>
        <form (ngSubmit)="submit()">
          <input [(ngModel)]="name" name="name" placeholder="Full name" required />
          <input [(ngModel)]="email" name="email" type="email" placeholder="Email" required />
          <input [(ngModel)]="phone" name="phone" placeholder="Phone (e.g. +1 555 000 0000)" required />
          <input [(ngModel)]="password" name="password" type="password" placeholder="Password (min 8 chars)" required />
          <button type="submit" [disabled]="loading()">{{ loading() ? 'Creating…' : 'Create Account' }}</button>
        </form>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <p class="link">Already have an account? <a routerLink="/login">Sign in</a></p>
      </div>
    </div>
  `,
})
export class RegisterPage {
  name = ''; email = ''; phone = ''; password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.loading.set(true); this.error.set('');
    this.auth.register(this.name, this.email, this.phone, this.password).subscribe({
      next: () => this.router.navigate(['/home']),
      error: e => { this.error.set(e.error?.message ?? 'Registration failed'); this.loading.set(false); },
    });
  }
}
