import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { RideService, UpcomingRide } from '../../core/ride.service';

type Mode = 'now' | 'schedule';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, DatePipe],
  template: `
    <div class="page has-bottom-nav">
      <header class="topbar">
        <span class="brand">CommunityRide</span>
        <div class="topbar-actions">
          <span class="user-chip">{{ firstName() }}</span>
          <button class="ghost-sm" (click)="auth.logout()">Sign out</button>
        </div>
      </header>

      <main class="content">

        @if (checking()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Checking for active rides…</p>
          </div>
        } @else {

          <!-- Mode toggle -->
          <div class="mode-toggle">
            <button [class.selected]="mode() === 'now'" (click)="mode.set('now')">
              ⚡ Ride Now
            </button>
            <button [class.selected]="mode() === 'schedule'" (click)="mode.set('schedule')">
              🗓 Schedule
            </button>
          </div>

          <!-- ── Ride Now ── -->
          @if (mode() === 'now') {
            <div class="card">
              <h2 class="form-heading">Where are you going?</h2>

              <label>Pickup address</label>
              <input [(ngModel)]="pickupAddress" placeholder="123 Main St" autocomplete="street-address" />

              <label>Drop-off address</label>
              <input [(ngModel)]="dropAddress" placeholder="456 Oak Ave" autocomplete="off" />

              <label>Passengers</label>
              <select [(ngModel)]="passengerCount">
                <option [value]="1">1 passenger</option>
                <option [value]="2">2 passengers</option>
                <option [value]="3">3 passengers</option>
                <option [value]="4">4 passengers</option>
              </select>

              @if (fareHint()) {
                <div class="fare-preview">
                  <span class="fare-label">Estimated fare</span>
                  <span class="fare-amount">\${{ fareHint() }}</span>
                  <span class="fare-note">~15 min · 5 mi</span>
                </div>
              }

              <button (click)="requestNow()" [disabled]="loading() || !pickupAddress || !dropAddress" class="cta-btn">
                @if (loading()) { <span class="btn-spinner"></span> Requesting… }
                @else { Request Ride }
              </button>

              @if (error()) { <p class="error">{{ error() }}</p> }
            </div>
          }

          <!-- ── Schedule ── -->
          @if (mode() === 'schedule') {
            <div class="card">
              <h2 class="form-heading">Book a ride in advance</h2>
              <p class="hint" style="margin-bottom:1rem">
                Reserve your ride ahead of time. A driver will confirm and you'll see them here.
              </p>

              <label>Pickup address</label>
              <input [(ngModel)]="schedPickup" placeholder="123 Main St" autocomplete="street-address" />

              <label>Drop-off address</label>
              <input [(ngModel)]="schedDrop" placeholder="456 Oak Ave" autocomplete="off" />

              <div class="date-time-row">
                <div class="date-field">
                  <label>Date</label>
                  <input type="date" [(ngModel)]="schedDate" [min]="today()" />
                </div>
                <div class="time-field">
                  <label>Time</label>
                  <input type="time" [(ngModel)]="schedTime" />
                </div>
              </div>

              <label>Passengers</label>
              <select [(ngModel)]="schedPassengers">
                <option [value]="1">1 passenger</option>
                <option [value]="2">2 passengers</option>
                <option [value]="3">3 passengers</option>
                <option [value]="4">4 passengers</option>
              </select>

              @if (fareHint()) {
                <div class="fare-preview">
                  <span class="fare-label">Estimated fare</span>
                  <span class="fare-amount">\${{ fareHint() }}</span>
                  <span class="fare-note">Price locked at booking</span>
                </div>
              }

              <button
                (click)="requestScheduled()"
                [disabled]="schedLoading() || !schedPickup || !schedDrop || !schedDate || !schedTime"
                class="cta-btn sched-btn">
                @if (schedLoading()) { <span class="btn-spinner"></span> Booking… }
                @else { Confirm Booking }
              </button>

              @if (schedError()) { <p class="error">{{ schedError() }}</p> }
              @if (schedSuccess()) {
                <div class="success-banner">
                  ✅ Ride booked for {{ schedSuccess() | date:'EEE, MMM d · h:mm a' }}!
                  Your driver will confirm shortly.
                </div>
              }
            </div>
          }

          <!-- ── Upcoming scheduled rides ── -->
          @if (upcoming().length > 0) {
            <div style="margin-top:0.25rem">
              <h3 class="section-title">Upcoming Rides</h3>
              @for (r of upcoming(); track r.id) {
                <div class="upcoming-card" [class.confirmed]="r.status === 'driver_accepted'">
                  <div class="upcoming-time">
                    <span class="upcoming-date">{{ r.scheduledAt | date:'EEE, MMM d' }}</span>
                    <span class="upcoming-clock">{{ r.scheduledAt | date:'h:mm a' }}</span>
                  </div>
                  <div class="upcoming-details">
                    <p class="upcoming-addr">{{ r.pickupAddress }}</p>
                    <p class="upcoming-addr drop">→ {{ r.dropAddress }}</p>
                    @if (r.status === 'driver_accepted' && r.driverName) {
                      <p class="upcoming-driver">🚗 {{ r.driverName }} · {{ r.vehicleInfo }}</p>
                    }
                    @if (r.status === 'scheduled') {
                      <span class="upcoming-badge pending">Awaiting driver</span>
                    } @else if (r.status === 'driver_accepted') {
                      <span class="upcoming-badge confirmed">Driver confirmed</span>
                    }
                    @if (r.fareEstimate) {
                      <span class="upcoming-fare">\${{ r.fareEstimate }}</span>
                    }
                  </div>
                  <a [routerLink]="['/active-ride', r.id]" class="upcoming-view">View →</a>
                </div>
              }
            </div>
          }

        }
      </main>

      <!-- Bottom navigation -->
      <nav class="bottom-nav">
        <a routerLink="/home" routerLinkActive="active-link">
          <span class="nav-icon">🏠</span> Home
        </a>
        <a routerLink="/history" routerLinkActive="active-link">
          <span class="nav-icon">📋</span> History
        </a>
        <a routerLink="/profile" routerLinkActive="active-link">
          <span class="nav-icon">👤</span> Profile
        </a>
      </nav>
    </div>
  `,
  styles: [`
    /* Mode toggle */
    .mode-toggle {
      display: flex; gap: 0.5rem; margin-bottom: 1rem;
      background: #e2e8f0; border-radius: 12px; padding: 4px;
    }
    .mode-toggle button {
      flex: 1; background: transparent; color: #64748b;
      border-radius: 9px; padding: 0.55rem; font-size: 0.9rem;
      font-weight: 600; margin: 0; min-height: 40px;
      transition: background 0.15s, color 0.15s;
    }
    .mode-toggle button.selected {
      background: #fff; color: #1e293b;
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    }

    /* Form */
    .form-heading { font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; color: #0f172a; }
    .date-time-row { display: flex; gap: 0.75rem; }
    .date-field { flex: 3; }
    .time-field { flex: 2; }

    /* Fare preview */
    .fare-preview {
      display: flex; align-items: center; gap: 0.75rem;
      background: #f0f9ff; border: 1px solid #bae6fd;
      border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 0.75rem;
    }
    .fare-label { font-size: 0.8rem; font-weight: 600; color: #0369a1; flex: 1; }
    .fare-amount { font-size: 1.3rem; font-weight: 800; color: #0ea5e9; }
    .fare-note { font-size: 0.75rem; color: #64748b; }

    /* CTA button */
    .cta-btn { background: #1a1a2e; margin-top: 0.25rem; font-size: 1rem; letter-spacing: 0.2px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .cta-btn:hover:not(:disabled) { background: #0f172a; }
    .sched-btn { background: #7c3aed; }
    .sched-btn:hover:not(:disabled) { background: #6d28d9; }
    .btn-spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
      animation: spin 0.7s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Success banner */
    .success-banner {
      background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px;
      padding: 0.85rem 1rem; color: #15803d; font-weight: 600;
      font-size: 0.9rem; margin-top: 0.75rem; line-height: 1.5;
    }

    /* Section title */
    .section-title {
      font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: #64748b; margin-bottom: 0.6rem;
    }

    /* Upcoming ride cards */
    .upcoming-card {
      background: #fff; border-radius: 14px; padding: 1rem;
      margin-bottom: 0.75rem; border: 1.5px solid #e2e8f0;
      display: flex; align-items: flex-start; gap: 0.75rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .upcoming-card.confirmed { border-color: #86efac; background: #f0fdf4; }
    .upcoming-time {
      display: flex; flex-direction: column; align-items: center;
      background: #f8fafc; border-radius: 10px; padding: 0.6rem 0.75rem;
      min-width: 64px; flex-shrink: 0; text-align: center;
    }
    .upcoming-date { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .upcoming-clock { font-size: 1rem; font-weight: 800; color: #1e293b; margin-top: 0.15rem; }
    .upcoming-details { flex: 1; min-width: 0; }
    .upcoming-addr { font-size: 0.85rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .upcoming-addr.drop { color: #64748b; margin-top: 0.15rem; }
    .upcoming-driver { font-size: 0.78rem; color: #16a34a; margin-top: 0.35rem; font-weight: 600; }
    .upcoming-badge {
      display: inline-block; font-size: 0.7rem; font-weight: 700;
      padding: 0.15rem 0.6rem; border-radius: 20px; margin-top: 0.35rem;
    }
    .upcoming-badge.pending   { background: #fef9c3; color: #854d0e; }
    .upcoming-badge.confirmed { background: #dcfce7; color: #16a34a; }
    .upcoming-fare { font-size: 0.82rem; font-weight: 700; color: #3b82f6; margin-left: 0.5rem; }
    .upcoming-view {
      font-size: 0.8rem; color: #3b82f6; text-decoration: none;
      font-weight: 700; flex-shrink: 0; align-self: center;
    }

    /* User chip */
    .user-chip { font-size: 0.85rem; color: #94a3b8; }
    .ghost-sm {
      background: transparent; border: 1px solid #334155; color: #94a3b8;
      padding: 0.3rem 0.65rem; font-size: 0.8rem; border-radius: 6px;
      width: auto; margin: 0; min-height: 0;
    }
  `],
})
export class HomePage implements OnInit {
  // Ride Now fields
  pickupAddress = '';
  dropAddress = '';
  passengerCount = 1;
  loading = signal(false);
  error = signal('');

  // Schedule fields
  schedPickup = '';
  schedDrop = '';
  schedDate = '';
  schedTime = '';
  schedPassengers = 1;
  schedLoading = signal(false);
  schedError = signal('');
  schedSuccess = signal<string | null>(null);

  // Shared state
  mode = signal<Mode>('now');
  checking = signal(true);
  upcoming = signal<UpcomingRide[]>([]);

  fareHint = signal<string | null>('12.50'); // static estimate — replace with real API call if fare service supports it

  firstName(): string {
    const name = this.auth.currentUser()?.name ?? '';
    return name.split(' ')[0] ?? name;
  }

  constructor(
    public auth: AuthService,
    private rides: RideService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Check for active non-scheduled ride → redirect
    this.rides.getMyActiveRide().subscribe({
      next: ride => {
        this.checking.set(false);
        if (ride?.id) {
          this.router.navigate(['/active-ride', ride.id]);
        }
      },
      error: () => this.checking.set(false),
    });

    // Load upcoming scheduled rides
    this.rides.getMyUpcoming().subscribe({
      next: list => this.upcoming.set(list),
      error: () => {},
    });
  }

  today(): string {
    return new Date().toISOString().split('T')[0];
  }

  requestNow() {
    this.loading.set(true); this.error.set('');
    this.rides.requestRide({
      pickupLat: 37.7749, pickupLng: -122.4194,
      pickupAddress: this.pickupAddress,
      dropLat: 37.7849, dropLng: -122.4094,
      dropAddress: this.dropAddress,
      passengerCount: Number(this.passengerCount),
    }).subscribe({
      next: ride => { this.loading.set(false); this.router.navigate(['/active-ride', ride.id]); },
      error: e => { this.error.set(e.error?.message ?? 'Request failed'); this.loading.set(false); },
    });
  }

  requestScheduled() {
    if (!this.schedDate || !this.schedTime) return;
    const scheduledAt = new Date(`${this.schedDate}T${this.schedTime}`).toISOString();
    const now = Date.now();
    const pickupMs = new Date(scheduledAt).getTime();
    if (pickupMs - now < 30 * 60 * 1000) {
      this.schedError.set('Please pick a time at least 30 minutes from now.');
      return;
    }

    this.schedLoading.set(true);
    this.schedError.set('');
    this.schedSuccess.set(null);

    this.rides.requestRide({
      pickupLat: 37.7749, pickupLng: -122.4194,
      pickupAddress: this.schedPickup,
      dropLat: 37.7849, dropLng: -122.4094,
      dropAddress: this.schedDrop,
      passengerCount: Number(this.schedPassengers),
      scheduledAt,
    }).subscribe({
      next: ride => {
        this.schedLoading.set(false);
        this.schedSuccess.set(scheduledAt);
        // Add to upcoming list immediately
        this.rides.getMyUpcoming().subscribe(list => this.upcoming.set(list));
        // Clear form
        this.schedPickup = '';
        this.schedDrop = '';
        this.schedDate = '';
        this.schedTime = '';
      },
      error: e => {
        this.schedError.set(e.error?.message ?? 'Booking failed. Please try again.');
        this.schedLoading.set(false);
      },
    });
  }
}
