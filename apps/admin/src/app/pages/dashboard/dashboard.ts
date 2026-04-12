import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AdminApiService } from '../../core/admin.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">CommunityRide Admin</span>
        <nav>
          <a routerLink="/users">Users</a>
          <a routerLink="/drivers">Drivers</a>
          <a routerLink="/rides">Rides</a>
          <a routerLink="/incidents">Incidents</a>
          <button (click)="auth.logout()">Sign Out</button>
        </nav>
      </header>

      <main class="content">
        <h1>Dashboard</h1>

        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ stats()?.['totalUsers'] ?? '…' }}</span>
            <span class="stat-label">Total Users</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats()?.['totalDrivers'] ?? '…' }}</span>
            <span class="stat-label">Drivers</span>
          </div>
          <div class="stat-card pending-card">
            <span class="stat-value">{{ stats()?.['pendingDrivers'] ?? '…' }}</span>
            <span class="stat-label">Pending Approvals</span>
          </div>
        </div>

        <div class="shortcuts">
          <a routerLink="/drivers" class="shortcut">Review Driver Applications →</a>
          <a routerLink="/rides" class="shortcut">Monitor Active Rides →</a>
          <a routerLink="/incidents" class="shortcut">Open Incidents →</a>
        </div>
      </main>
    </div>
  `,
})
export class DashboardPage implements OnInit {
  stats = signal<Record<string, number> | null>(null);
  constructor(public auth: AuthService, private admin: AdminApiService) {}
  ngOnInit() { this.admin.getStats().subscribe(s => this.stats.set(s)); }
}
