import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { API } from '../../core/env';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">CommunityRide</span>
        <nav><a routerLink="/home">← Home</a></nav>
      </header>

      <main class="content">
        <h1>My Profile</h1>

        @if (auth.currentUser()) {
          <div class="card">
            <label>Name</label>
            <input [(ngModel)]="name" />
            <label>Phone</label>
            <input [(ngModel)]="phone" />
            <button (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save Changes' }}
            </button>
            @if (saved()) { <p class="success">Saved!</p> }
          </div>

          <div class="card">
            <p><strong>Email:</strong> {{ auth.currentUser()!.email }}</p>
            <p><strong>Role:</strong> {{ auth.currentUser()!.role }}</p>
            <button class="danger" (click)="auth.logout()">Sign Out</button>
          </div>
        }
      </main>
    </div>
  `,
})
export class ProfilePage implements OnInit {
  name = '';
  phone = '';
  saving = signal(false);
  saved = signal(false);

  constructor(public auth: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.name = this.auth.currentUser()?.name ?? '';
    this.phone = this.auth.currentUser()?.phone ?? '';
  }

  save() {
    this.saving.set(true);
    this.saved.set(false);
    this.http.patch(`${API}/users/me`, { name: this.name, phone: this.phone }).subscribe({
      next: () => { this.auth.loadProfile(); this.saving.set(false); this.saved.set(true); },
      error: () => this.saving.set(false),
    });
  }
}
