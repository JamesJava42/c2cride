import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../../core/admin.service';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">CommunityRide Admin</span>
        <nav><a routerLink="/dashboard">← Dashboard</a></nav>
      </header>

      <main class="content">
        <h1>Incident Reports</h1>

        @for (inc of incidents(); track inc.id) {
          <div class="card incident-card">
            <div class="incident-header">
              <span class="status-badge" [class]="inc.status">{{ inc.status }}</span>
              <span class="meta">{{ inc.createdAt | date:'short' }}</span>
            </div>
            <p><strong>Type:</strong> {{ inc.incidentType.replace(/_/g,' ') }}</p>
            <p><strong>Ride:</strong> {{ inc.rideRequestId }}</p>
            @if (inc.description) { <p class="desc">{{ inc.description }}</p> }
            @if (inc.status === 'open') {
              <div class="incident-actions">
                <button (click)="resolve(inc.id)">✓ Resolve</button>
              </div>
            }
          </div>
        }

        @if (incidents().length === 0) { <p class="empty">No incidents reported.</p> }
      </main>
    </div>
  `,
})
export class IncidentsPage implements OnInit {
  incidents = signal<any[]>([]);
  constructor(private admin: AdminApiService) {}
  ngOnInit() { this.admin.getIncidents().subscribe(r => this.incidents.set(r)); }

  resolve(id: string) {
    this.admin.resolveIncident(id).subscribe(() =>
      this.incidents.update(list =>
        list.map(i => i.id === id ? { ...i, status: 'resolved' } : i)
      )
    );
  }
}
