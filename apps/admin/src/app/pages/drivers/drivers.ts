import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../core/admin.service';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">CommunityRide Admin</span>
        <nav><a routerLink="/dashboard">← Dashboard</a></nav>
      </header>

      <main class="content">
        <h1>Drivers</h1>

        @for (d of drivers(); track d.id) {
          <div class="card driver-card">
            <div class="driver-row">
              <div>
                <strong>{{ d.user?.name ?? d.id }}</strong>
                <span class="email">{{ d.user?.email }}</span>
              </div>
              <span class="status-badge" [class]="d.approvalStatus">{{ d.approvalStatus }}</span>
            </div>
            <p class="meta">
              License: {{ d.licenseNumber }} ({{ d.licenseState }}) ·
              Score: {{ d.reliabilityScore }}
            </p>
            @if (d.approvalStatus === 'pending') {
              <div class="actions">
                <button (click)="approve(d.id)">✅ Approve</button>
                <button class="danger" (click)="reject(d.id)">❌ Reject</button>
              </div>
            }
          </div>
        }

        @if (drivers().length === 0) { <p class="empty">No drivers found.</p> }
      </main>
    </div>
  `,
})
export class DriversPage implements OnInit {
  drivers = signal<any[]>([]);
  constructor(private admin: AdminApiService) {}
  ngOnInit() { this.admin.getDrivers().subscribe(d => this.drivers.set(d)); }

  approve(id: string) {
    this.admin.approveDriver(id).subscribe(() =>
      this.drivers.update(list => list.map(d => d.id === id ? { ...d, approvalStatus: 'approved' } : d))
    );
  }
  reject(id: string) {
    this.admin.rejectDriver(id).subscribe(() =>
      this.drivers.update(list => list.map(d => d.id === id ? { ...d, approvalStatus: 'rejected' } : d))
    );
  }
}
