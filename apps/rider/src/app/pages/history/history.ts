import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RideService, RideRequest } from '../../core/ride.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">CommunityRide</span>
        <a routerLink="/home">← Request Ride</a>
      </header>

      <main class="content">
        <h1>My Rides</h1>

        @if (rides().length === 0 && !loading()) {
          <p class="empty">No rides yet.</p>
        }

        @for (r of rides(); track r.id) {
          <div class="card ride-card">
            <div class="ride-row">
              <span class="status-badge" [class]="r.status">{{ r.status.replace(/_/g,' ') }}</span>
              <span class="date">{{ r.requestedAt | date:'medium' }}</span>
            </div>
            <p>{{ r.pickupAddress }} → {{ r.dropAddress }}</p>
            @if (r.fareEstimate) { <p class="fare">\${{ r.fareEstimate }}</p> }
            <a routerLink="/active-ride/{{ r.id }}">View details →</a>
          </div>
        }
      </main>
    </div>
  `,
})
export class HistoryPage implements OnInit {
  rides = signal<RideRequest[]>([]);
  loading = signal(true);

  constructor(private rideService: RideService) {}

  ngOnInit() {
    this.rideService.getMyRides().subscribe({
      next: r => { this.rides.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
