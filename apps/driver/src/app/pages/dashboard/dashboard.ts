import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { DriverService, DriverSession, Vehicle, Offer, AvailableRide } from '../../core/driver.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">CommunityRide Driver</span>
        <nav>
          <a routerLink="/profile">Profile</a>
          <button (click)="auth.logout()">Sign Out</button>
        </nav>
      </header>

      <main class="content">

        @if (loadError()) {
          <div class="card" style="border-color:#ef4444">
            <p class="error">{{ loadError() }}</p>
            <button (click)="auth.logout()">Sign out and try again</button>
          </div>
        }

        <!-- ── Online / Offline toggle ── -->
        <div class="card">
          <h3>Status</h3>
          @if (!session()) {
            <p class="status-text">You are <strong>offline</strong></p>
            @if (vehicles().length > 0) {
              <label>Select vehicle</label>
              <select [(ngModel)]="selectedVehicleId">
                @for (v of vehicles(); track v.id) {
                  <option [value]="v.id">{{ v.year }} {{ v.make }} {{ v.model }} — {{ v.plate }}</option>
                }
              </select>
              <button (click)="goOnline()" [disabled]="toggling()">
                {{ toggling() ? 'Going online…' : 'Go Online' }}
              </button>
            } @else {
              <p class="hint">Add a vehicle in your profile to go online.</p>
              <a routerLink="/profile" class="btn">Go to Profile</a>
            }
          } @else {
            <div class="online-row">
              <div>
                <p class="status-text online">● Online</p>
                @if (session()!.vehicle) {
                  <p class="hint">{{ session()!.vehicle!.make }} {{ session()!.vehicle!.model }} · {{ session()!.vehicle!.plate }}</p>
                }
              </div>
              <button class="danger" (click)="goOffline()" [disabled]="toggling()" style="width:auto;padding:.4rem .9rem;margin:0">
                {{ toggling() ? '…' : 'Go Offline' }}
              </button>
            </div>
          }
          @if (sessionError()) { <p class="error">{{ sessionError() }}</p> }
        </div>

        @if (session()) {

          <!-- ── Incoming offer (dispatched by admin) ── -->
          @if (offer()) {
            <div class="card offer-card">
              <div class="offer-badge">New Offer</div>
              <p style="margin:.5rem 0"><strong>Pickup:</strong> {{ offer()!.rideRequest?.pickupAddress }}</p>
              <p style="margin-bottom:.5rem"><strong>Drop-off:</strong> {{ offer()!.rideRequest?.dropAddress }}</p>
              <p class="hint">{{ offer()!.rideRequest?.passengerCount }} passenger{{ offer()!.rideRequest?.passengerCount !== 1 ? 's' : '' }}
                @if (offer()!.rideRequest?.fareEstimate) { · <span class="fare">{{ '$' + offer()!.rideRequest!.fareEstimate }}</span> }
              </p>
              <p class="hint" style="margin-top:.25rem">Expires {{ offer()!.expiresAt | date:'shortTime' }}</p>
              <div class="offer-actions">
                <button (click)="acceptOffer()" [disabled]="responding()">
                  {{ responding() ? 'Accepting…' : '✓ Accept' }}
                </button>
                <button class="danger" (click)="declineOffer()" [disabled]="responding()">Decline</button>
              </div>
            </div>
          }

          <!-- ── Available rides (immediate) ── -->
          @if (!offer()) {
            <div class="card">
              <div class="section-header">
                <h3>Available Now <span class="count-badge">{{ availableRides().length }}</span></h3>
                <span class="hint" style="font-size:.75rem">Updates every 5s</span>
              </div>

              @if (availableRides().length === 0) {
                <p class="empty" style="margin:0;padding:1rem 0">No rides waiting right now.</p>
              }

              @for (r of availableRides(); track r.id) {
                <div class="ride-row-item">
                  <div class="ride-row-info">
                    <p class="ride-addr">{{ r.pickupAddress }}</p>
                    <p class="ride-addr drop">→ {{ r.dropAddress }}</p>
                    <p class="ride-meta">
                      {{ r.passengerCount }} pax
                      @if (r.fareEstimate) { · <span class="fare">{{ '$' + r.fareEstimate }}</span> }
                      · {{ r.requestedAt | date:'shortTime' }}
                    </p>
                  </div>
                  <button class="take-btn" (click)="takeRide(r.id)" [disabled]="accepting() === r.id">
                    {{ accepting() === r.id ? '…' : 'Take' }}
                  </button>
                </div>
              }
            </div>

            <!-- ── Scheduled rides ── -->
            <div class="card">
              <div class="section-header">
                <h3>Scheduled Rides <span class="count-badge sched">{{ scheduledRides().length }}</span></h3>
                <span class="hint" style="font-size:.75rem">Pre-book ahead</span>
              </div>

              @if (scheduledRides().length === 0) {
                <p class="empty" style="margin:0;padding:1rem 0">No scheduled rides available.</p>
              }

              @for (r of scheduledRides(); track r.id) {
                <div class="ride-row-item sched-item">
                  <div class="sched-time-col">
                    <span class="sched-day">{{ r.scheduledAt | date:'EEE' }}</span>
                    <span class="sched-clock">{{ r.scheduledAt | date:'h:mm a' }}</span>
                    <span class="sched-date">{{ r.scheduledAt | date:'MMM d' }}</span>
                  </div>
                  <div class="ride-row-info">
                    <p class="ride-addr">{{ r.pickupAddress }}</p>
                    <p class="ride-addr drop">→ {{ r.dropAddress }}</p>
                    <p class="ride-meta">
                      {{ r.passengerCount }} pax
                      @if (r.fareEstimate) { · <span class="fare">{{ '$' + r.fareEstimate }}</span> }
                    </p>
                  </div>
                  <button class="take-btn sched-btn" (click)="takeRide(r.id)" [disabled]="accepting() === r.id">
                    {{ accepting() === r.id ? '…' : 'Confirm' }}
                  </button>
                </div>
              }
            </div>
          }

          @if (acceptError()) {
            <div class="card" style="border-color:#ef4444;padding:.75rem 1rem">
              <p class="error" style="margin:0">{{ acceptError() }}</p>
            </div>
          }

        }

      </main>
    </div>
  `,
  styles: [`
    .online-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .status-text { font-size: .95rem; margin-bottom: .35rem; }
    .status-text.online { color: #4ade80; font-weight: 700; }

    .offer-card { border: 2px solid #f59e0b; }
    .offer-badge {
      display: inline-block; background: #f59e0b; color: #1e293b;
      font-size: .7rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: .5px; padding: .2rem .6rem; border-radius: 6px; margin-bottom: .5rem;
    }
    .offer-actions { display: flex; gap: .75rem; margin-top: .75rem; }
    .offer-actions button { flex: 1; margin: 0; }

    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .75rem; }
    .section-header h3 { margin: 0; display: flex; align-items: center; gap: .4rem; }
    .count-badge {
      display: inline-block; background: #334155; color: #94a3b8;
      border-radius: 10px; padding: .05rem .5rem; font-size: .75rem; font-weight: 700;
    }
    .count-badge.sched { background: #312e81; color: #a5b4fc; }

    .ride-row-item {
      display: flex; align-items: center; gap: .75rem;
      padding: .75rem 0; border-top: 1px solid #1e293b;
    }
    .ride-row-info { flex: 1; min-width: 0; }
    .ride-addr { font-size: .85rem; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ride-addr.drop { color: #64748b; margin-top: .15rem; }
    .ride-meta { font-size: .75rem; color: #475569; margin-top: .25rem; }

    .take-btn {
      background: #38bdf8; color: #0f172a; border: none; border-radius: 8px;
      padding: .45rem .9rem; font-weight: 700; font-size: .85rem;
      cursor: pointer; flex-shrink: 0; width: auto; margin: 0; min-height: 40px;
    }
    .take-btn:disabled { opacity: .45; cursor: not-allowed; }
    .sched-btn { background: #818cf8; }

    /* Scheduled ride time column */
    .sched-item { align-items: flex-start; }
    .sched-time-col {
      display: flex; flex-direction: column; align-items: center;
      background: #0f172a; border-radius: 8px; padding: .4rem .6rem;
      min-width: 52px; flex-shrink: 0; text-align: center;
    }
    .sched-day   { font-size: .68rem; font-weight: 700; color: #818cf8; text-transform: uppercase; }
    .sched-clock { font-size: .88rem; font-weight: 800; color: #f1f5f9; line-height: 1.2; margin: .1rem 0; }
    .sched-date  { font-size: .65rem; color: #475569; }
  `],
})
export class DashboardPage implements OnInit, OnDestroy {
  session = signal<DriverSession | null>(null);
  vehicles = signal<Vehicle[]>([]);
  offer = signal<Offer | null>(null);
  availableRides = signal<AvailableRide[]>([]);
  scheduledRides = signal<AvailableRide[]>([]);
  selectedVehicleId = '';
  toggling = signal(false);
  responding = signal(false);
  accepting = signal<string | null>(null);
  sessionError = signal('');
  loadError = signal('');
  acceptError = signal('');

  private hb?: Subscription;
  private pollOffers?: Subscription;
  private pollAvailable?: Subscription;
  private pollScheduled?: Subscription;

  constructor(public auth: AuthService, private driver: DriverService, private router: Router) {}

  ngOnInit() {
    this.driver.getVehicles().subscribe({
      next: v => {
        this.vehicles.set(v);
        if (v.length > 0) this.selectedVehicleId = v[0].id;
      },
      error: e => this.loadError.set(this.apiError(e, 'load your vehicles')),
    });

    this.driver.getActiveSession().subscribe({
      next: s => {
        this.session.set(s);
        if (s) {
          this.startPolls();
          // Check if driver has an active ride in progress → redirect
          this.checkActiveRide();
        }
      },
      error: e => this.loadError.set(this.apiError(e, 'check your session')),
    });
  }

  ngOnDestroy() { this.stopPolls(); }

  private checkActiveRide() {
    // If driver already has an active assignment, take them to it
    this.driver.getRide('__placeholder__').subscribe({ error: () => {} }); // warm up
    // Check for current active assignment via assignments endpoint
    // Simple approach: poll available rides will show if nothing is assigned.
    // Real check: look for driver_accepted/enroute/arrived/in_progress rides via own endpoint.
    // For now, the active-ride page handles the back-navigation correctly.
  }

  goOnline() {
    if (!this.selectedVehicleId) return;
    this.toggling.set(true);
    this.sessionError.set('');
    this.driver.goOnline(this.selectedVehicleId).subscribe({
      next: s => {
        this.session.set(s);
        this.toggling.set(false);
        this.startPolls();
      },
      error: e => { this.sessionError.set(e.error?.message ?? 'Failed to go online'); this.toggling.set(false); },
    });
  }

  goOffline() {
    this.toggling.set(true);
    this.driver.goOffline().subscribe({
      next: () => {
        this.session.set(null);
        this.offer.set(null);
        this.availableRides.set([]);
        this.scheduledRides.set([]);
        this.toggling.set(false);
        this.stopPolls();
      },
      error: () => this.toggling.set(false),
    });
  }

  acceptOffer() {
    const o = this.offer(); if (!o) return;
    this.responding.set(true);
    this.driver.respondToOffer(o.id, true).subscribe({
      next: (assignment: any) => {
        this.responding.set(false);
        this.offer.set(null);
        if (assignment?.rideRequestId) {
          this.router.navigate(['/active-ride', assignment.rideRequestId]);
        }
      },
      error: () => { this.responding.set(false); this.offer.set(null); },
    });
  }

  declineOffer() {
    const o = this.offer(); if (!o) return;
    this.driver.respondToOffer(o.id, false).subscribe({
      next: () => this.offer.set(null),
      error: () => this.offer.set(null),
    });
  }

  takeRide(rideId: string) {
    this.accepting.set(rideId);
    this.acceptError.set('');
    this.driver.acceptRide(rideId).subscribe({
      next: (ride: any) => {
        this.accepting.set(null);
        this.router.navigate(['/active-ride', ride.id]);
      },
      error: e => {
        this.accepting.set(null);
        this.acceptError.set(e.error?.message ?? 'Could not take this ride — it may have been taken already.');
        this.driver.getAvailableRides().subscribe(r => this.availableRides.set(r));
        this.driver.getScheduledRides().subscribe(r => this.scheduledRides.set(r));
      },
    });
  }

  private startPolls() {
    this.hb?.unsubscribe();
    this.hb = interval(20000).pipe(switchMap(() => this.driver.heartbeat())).subscribe();

    // Offer poll (admin dispatch)
    this.pollOffers?.unsubscribe();
    this.pollOffers = interval(4000).pipe(switchMap(() => this.driver.getPendingOffer())).subscribe({
      next: offer => this.offer.set(offer),
      error: () => {},
    });

    // Immediate rides poll
    this.driver.getAvailableRides().subscribe(r => this.availableRides.set(r));
    this.pollAvailable?.unsubscribe();
    this.pollAvailable = interval(5000).pipe(switchMap(() => this.driver.getAvailableRides())).subscribe({
      next: r => this.availableRides.set(r),
      error: () => {},
    });

    // Scheduled rides poll (less frequent)
    this.driver.getScheduledRides().subscribe(r => this.scheduledRides.set(r));
    this.pollScheduled?.unsubscribe();
    this.pollScheduled = interval(15000).pipe(switchMap(() => this.driver.getScheduledRides())).subscribe({
      next: r => this.scheduledRides.set(r),
      error: () => {},
    });
  }

  private stopPolls() {
    this.hb?.unsubscribe();
    this.pollOffers?.unsubscribe();
    this.pollAvailable?.unsubscribe();
    this.pollScheduled?.unsubscribe();
  }

  private apiError(e: any, action: string): string {
    if (e.status === 403) return `Access denied trying to ${action}. Make sure you're logged in as a driver.`;
    if (e.status === 401) return `Session expired. Please sign out and log in again.`;
    return e.error?.message ?? `Failed to ${action}.`;
  }
}
