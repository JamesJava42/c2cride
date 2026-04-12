import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../../core/admin.service';

type Tab = 'active' | 'attention';

@Component({
  selector: 'app-rides',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">CommunityRide Admin</span>
        <nav><a routerLink="/dashboard">← Dashboard</a></nav>
      </header>

      <main class="content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h1 style="margin:0">Rides</h1>
          <button (click)="refresh()" style="width:auto;padding:.4rem .9rem;font-size:.85rem;margin:0">↻ Refresh</button>
        </div>

        <!-- Feedback banner -->
        @if (actionMsg()) {
          <div class="card" [style.border-color]="actionOk() ? '#22c55e' : '#ef4444'" style="margin-bottom:.75rem">
            <p [style.color]="actionOk() ? '#16a34a' : '#dc2626'" style="font-size:.9rem">{{ actionMsg() }}</p>
          </div>
        }

        <!-- Tabs -->
        <div class="tab-bar">
          <button class="tab" [class.active-tab]="tab() === 'active'" (click)="setTab('active')">
            Active Rides
            @if (activeRides().length) { <span class="badge">{{ activeRides().length }}</span> }
          </button>
          <button class="tab" [class.active-tab]="tab() === 'attention'" (click)="setTab('attention')">
            Needs Attention
            @if (attentionRides().length) { <span class="badge danger-badge">{{ attentionRides().length }}</span> }
          </button>
        </div>

        <!-- Active rides -->
        @if (tab() === 'active') {
          @for (r of activeRides(); track r.id) {
            <div class="card ride-card">
              <div class="ride-header">
                <span class="status-badge" [class]="r.status">{{ r.status.replace(/_/g,' ') }}</span>
                <span class="meta">{{ r.requestedAt | date:'short' }}</span>
              </div>
              <p><strong>Rider:</strong> {{ r.riderNameSnapshot }} · {{ r.riderPhoneSnapshot }}</p>
              <p>{{ r.pickupAddress }} → {{ r.dropAddress }}</p>
              @if (r.fareEstimate) { <p class="fare">Est. {{ '$' + r.fareEstimate }}</p> }
              <div class="ride-actions">
                @if (r.status === 'searching_driver' || r.status === 'requested') {
                  <button (click)="dispatch(r.id)" [disabled]="busy() === r.id">
                    {{ busy() === r.id ? 'Dispatching…' : '🚗 Dispatch Driver' }}
                  </button>
                }
                <button class="danger" (click)="cancel(r.id)" [disabled]="busy() === r.id + '_cancel'">
                  {{ busy() === r.id + '_cancel' ? 'Cancelling…' : 'Cancel' }}
                </button>
              </div>
            </div>
          }
          @if (activeRides().length === 0) { <p class="empty">No active rides.</p> }
        }

        <!-- Needs attention: driver-cancelled, admin_queue, driver_no_show -->
        @if (tab() === 'attention') {
          <p class="hint" style="margin-bottom:.75rem">
            These rides need action — the driver cancelled, timed out, or dispatch was exhausted.
            Reset a ride to put it back in the queue and dispatch again.
          </p>
          @for (r of attentionRides(); track r.id) {
            <div class="card ride-card" style="border-left:3px solid #f59e0b">
              <div class="ride-header">
                <span class="status-badge" [class]="r.status">{{ r.status.replace(/_/g,' ') }}</span>
                <span class="meta">{{ r.requestedAt | date:'short' }}</span>
              </div>
              <p><strong>Rider:</strong> {{ r.riderNameSnapshot }} · {{ r.riderPhoneSnapshot }}</p>
              <p>{{ r.pickupAddress }} → {{ r.dropAddress }}</p>
              @if (r.fareEstimate) { <p class="fare">Est. {{ '$' + r.fareEstimate }}</p> }
              <div class="ride-actions">
                <button (click)="resetAndDispatch(r.id)" [disabled]="busy() === r.id">
                  {{ busy() === r.id ? 'Resetting…' : '↺ Reset & Dispatch' }}
                </button>
                <button class="danger" (click)="cancel(r.id)" [disabled]="busy() === r.id + '_cancel'">
                  Cancel
                </button>
              </div>
            </div>
          }
          @if (attentionRides().length === 0) { <p class="empty">No rides needing attention.</p> }
        }

      </main>
    </div>
  `,
  styles: [`
    .tab-bar { display: flex; gap: .5rem; margin-bottom: 1rem; }
    .tab {
      padding: .5rem 1rem; border-radius: 8px; border: 1.5px solid #e2e8f0;
      background: #fff; color: #475569; font-weight: 600; font-size: .88rem;
      cursor: pointer; display: flex; align-items: center; gap: .4rem; width: auto; margin: 0;
    }
    .tab:hover { background: #f8fafc; }
    .active-tab { background: #3b82f6; color: #fff; border-color: #3b82f6; }
    .badge {
      background: #e2e8f0; color: #475569; border-radius: 10px;
      padding: .05rem .45rem; font-size: .75rem; font-weight: 700;
    }
    .active-tab .badge { background: rgba(255,255,255,.25); color: #fff; }
    .danger-badge { background: #fee2e2 !important; color: #dc2626 !important; }
    .ride-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
    .meta { font-size: .8rem; color: #94a3b8; }
    .ride-actions { display: flex; gap: .5rem; margin-top: .75rem; flex-wrap: wrap; }
    .ride-actions button { width: auto; padding: .45rem .9rem; font-size: .85rem; margin: 0; }
    .fare { font-weight: 700; color: #3b82f6; font-size: .9rem; margin-top: .25rem; }

    .status-badge { display: inline-block; padding: .2rem .6rem; border-radius: 20px;
      font-size: .72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .4px; background: #e2e8f0; color: #475569; }
    .status-badge.completed { background: #dcfce7; color: #16a34a; }
    .status-badge.trip_in_progress { background: #dbeafe; color: #1d4ed8; }
    .status-badge.driver_accepted,
    .status-badge.driver_enroute_pickup,
    .status-badge.driver_arrived { background: #fef9c3; color: #854d0e; }
    .status-badge.cancelled_by_rider,.status-badge.cancelled_by_driver,
    .status-badge.cancelled_by_admin,.status-badge.expired_unassigned,
    .status-badge.driver_no_show,.status-badge.admin_queue { background: #fee2e2; color: #dc2626; }
  `],
})
export class RidesPage implements OnInit {
  activeRides = signal<any[]>([]);
  attentionRides = signal<any[]>([]);
  tab = signal<Tab>('active');
  busy = signal<string | null>(null);
  actionMsg = signal('');
  actionOk = signal(true);

  constructor(private admin: AdminApiService) {}

  ngOnInit() { this.load(); }

  setTab(t: Tab) { this.tab.set(t); this.actionMsg.set(''); }

  load() {
    this.admin.getActiveRides().subscribe(r => this.activeRides.set(r));
    this.admin.getNeedsAttentionRides().subscribe(r => this.attentionRides.set(r));
  }

  refresh() { this.actionMsg.set(''); this.load(); }

  dispatch(id: string) {
    this.busy.set(id);
    this.actionMsg.set('');
    this.admin.dispatchRide(id).subscribe({
      next: (offer: any) => {
        this.busy.set(null);
        this.actionOk.set(true);
        this.actionMsg.set('Offer sent to a driver. Waiting for acceptance.');
        this.load();
      },
      error: (e: any) => {
        this.busy.set(null);
        this.actionOk.set(false);
        const msg = e.error?.message ?? 'Dispatch failed';
        this.actionMsg.set(msg.includes('No eligible')
          ? 'No eligible driver online. Approve a driver and ensure they are online first.'
          : msg.includes('Max') ? 'Max dispatch attempts reached. Use Reset & Dispatch.'
          : 'Dispatch failed: ' + msg);
      },
    });
  }

  resetAndDispatch(id: string) {
    this.busy.set(id);
    this.actionMsg.set('');
    this.admin.resetRideForRedispatch(id).subscribe({
      next: () => {
        // After reset, dispatch immediately
        this.admin.dispatchRide(id).subscribe({
          next: () => {
            this.busy.set(null);
            this.actionOk.set(true);
            this.actionMsg.set('Ride reset and offer sent to an available driver.');
            this.load();
          },
          error: (e: any) => {
            this.busy.set(null);
            this.actionOk.set(false);
            this.actionMsg.set('Ride reset to queue. Dispatch failed: ' + (e.error?.message ?? 'No eligible driver online.'));
            this.load();
          },
        });
      },
      error: (e: any) => {
        this.busy.set(null);
        this.actionOk.set(false);
        this.actionMsg.set('Reset failed: ' + (e.error?.message ?? 'Unknown error'));
      },
    });
  }

  cancel(id: string) {
    this.busy.set(id + '_cancel');
    this.admin.cancelRide(id).subscribe({
      next: () => {
        this.busy.set(null);
        this.activeRides.update(list => list.filter(r => r.id !== id));
        this.attentionRides.update(list => list.filter(r => r.id !== id));
      },
      error: () => this.busy.set(null),
    });
  }
}
