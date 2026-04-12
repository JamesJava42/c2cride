import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RideService, RideRequest, RideMessage } from '../../core/ride.service';
import { AuthService } from '../../core/auth.service';

const TERMINAL = ['completed','cancelled_by_rider','cancelled_by_driver','cancelled_by_admin','expired_unassigned','rider_no_show','driver_no_show'];

interface Step { key: string; label: string; icon: string; }

// Steps for scheduled rides (driver_accepted means "confirmed, not yet started")
const SCHED_STEPS: Step[] = [
  { key: 'scheduled',            label: 'Booked',            icon: '🗓' },
  { key: 'driver_accepted',      label: 'Driver confirmed',  icon: '✅' },
  { key: 'driver_enroute_pickup',label: 'Driver en route',   icon: '🚗' },
  { key: 'driver_arrived',       label: 'Driver arrived',    icon: '📍' },
  { key: 'trip_in_progress',     label: 'Trip in progress',  icon: '🎯' },
  { key: 'completed',            label: 'Trip complete',     icon: '🏁' },
];

const STEPS: Step[] = [
  { key: 'requested',            label: 'Request sent',      icon: '📤' },
  { key: 'searching_driver',     label: 'Finding driver',    icon: '🔍' },
  { key: 'offer_pending',        label: 'Offer sent',        icon: '📨' },
  { key: 'driver_accepted',      label: 'Driver confirmed',  icon: '✅' },
  { key: 'driver_enroute_pickup',label: 'Driver en route',   icon: '🚗' },
  { key: 'driver_arrived',       label: 'Driver arrived',    icon: '📍' },
  { key: 'trip_in_progress',     label: 'Trip in progress',  icon: '🎯' },
  { key: 'completed',            label: 'Trip complete',     icon: '🏁' },
];

const STATUS_MSG: Record<string, string> = {
  scheduled:             'Your ride is booked! A driver will confirm shortly.',
  requested:             'Your request is in — looking for a driver now.',
  searching_driver:      'Searching for the best available driver nearby…',
  offer_pending:         'We found a driver! Waiting for them to confirm…',
  driver_accepted:       'Your driver has confirmed! They\'ll head over closer to pickup time.',
  driver_enroute_pickup: 'Your driver is on the way — get ready!',
  driver_arrived:        'Your driver has arrived at the pickup point!',
  rider_checked_in:      'Checked in — trip starting…',
  trip_in_progress:      'You\'re on your way! Sit back and relax.',
  completed:             'You\'ve arrived! Thanks for riding with CommunityRide.',
  cancelled_by_rider:    'You cancelled this ride.',
  cancelled_by_driver:   'The driver cancelled. We\'re sorry — please request a new ride.',
  cancelled_by_admin:    'This ride was cancelled by support.',
  expired_unassigned:    'No drivers were available. Please try again.',
};

@Component({
  selector: 'app-active-ride',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page ride-page">
      <header class="topbar">
        <span class="brand">CommunityRide</span>
        @if (isTerminal()) {
          <a routerLink="/home">New Ride</a>
        }
      </header>

      <main class="ride-content">

        @if (!ride()) {
          <div class="loading-card">
            <div class="spinner"></div>
            <p>Loading your ride…</p>
          </div>
        } @else {

          <!-- Status banner -->
          <div class="status-banner" [class]="bannerClass()">
            <div class="banner-icon">{{ bannerIcon() }}</div>
            <div class="banner-text">
              <p class="banner-title">{{ bannerTitle() }}</p>
              <p class="banner-msg">{{ statusMsg() }}</p>
            </div>
          </div>

          <!-- Scheduled pickup time banner -->
          @if (ride()!.scheduledAt && !isTerminal()) {
            <div class="sched-banner">
              <span class="sched-icon">🗓</span>
              <div>
                <p class="sched-label">Scheduled pickup</p>
                <p class="sched-time">{{ ride()!.scheduledAt | date:'EEEE, MMMM d · h:mm a' }}</p>
              </div>
            </div>
          }

          <!-- Progress steps (hidden on terminal/cancelled) -->
          @if (!isCancelled()) {
            <div class="steps-card">
              @for (step of activeSteps(); track step.key; let i = $index) {
                <div class="step" [class.done]="stepDone(i)" [class.active]="stepActive(i)">
                  <div class="step-dot">
                    @if (stepDone(i)) { <span>✓</span> }
                    @else if (stepActive(i)) { <div class="pulse-dot"></div> }
                    @else { <span class="step-num">{{ i + 1 }}</span> }
                  </div>
                  <div class="step-info">
                    <span class="step-icon">{{ step.icon }}</span>
                    <span class="step-label">{{ step.label }}</span>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Trip details -->
          <div class="card trip-details">
            <h3>Trip Details</h3>
            <div class="detail-row">
              <span class="detail-icon">📍</span>
              <div>
                <p class="detail-label">Pickup</p>
                <p class="detail-val">{{ ride()!.pickupAddress }}</p>
              </div>
            </div>
            <div class="detail-row">
              <span class="detail-icon">🏁</span>
              <div>
                <p class="detail-label">Drop-off</p>
                <p class="detail-val">{{ ride()!.dropAddress }}</p>
              </div>
            </div>
            @if (ride()!.fareEstimate) {
              <div class="detail-row">
                <span class="detail-icon">💵</span>
                <div>
                  <p class="detail-label">Estimated fare</p>
                  <p class="detail-val fare-val">\${{ ride()!.fareEstimate }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Driver info (shown once driver is assigned) -->
          @if (ride()!.driverName) {
            <div class="card driver-card">
              <h3>Your Driver</h3>
              <div class="driver-row">
                <div class="driver-avatar">{{ ride()!.driverName!.charAt(0).toUpperCase() }}</div>
                <div class="driver-info">
                  <p class="driver-name">{{ ride()!.driverName }}</p>
                  @if (ride()!.vehicleInfo) {
                    <p class="driver-vehicle">{{ ride()!.vehicleInfo }} · {{ ride()!.vehiclePlate }}</p>
                  }
                </div>
                @if (ride()!.driverPhone) {
                  <a [href]="'tel:' + ride()!.driverPhone" class="call-btn">
                    📞 Call
                  </a>
                }
              </div>
            </div>
          }

          <!-- Chat (shown when driver is assigned and ride is not terminal) -->
          @if (ride()!.driverName && !isTerminal()) {
            <div class="card chat-card">
              <h3>Message Driver</h3>
              <div class="chat-messages" #chatBox>
                @for (msg of messages(); track msg.id) {
                  <div class="msg" [class.mine]="msg.senderRole === 'rider'">
                    <span class="msg-sender">{{ msg.senderRole === 'rider' ? 'You' : msg.senderName }}</span>
                    <div class="msg-bubble">{{ msg.body }}</div>
                    <span class="msg-time">{{ msg.createdAt | date:'shortTime' }}</span>
                  </div>
                }
                @if (messages().length === 0) {
                  <p class="no-msgs">No messages yet. Say hi!</p>
                }
              </div>
              <div class="chat-input-row">
                <input
                  [(ngModel)]="chatInput"
                  placeholder="Type a message…"
                  (keydown.enter)="sendMessage()"
                  maxlength="500"
                  autocomplete="off" />
                <button class="send-btn" (click)="sendMessage()" [disabled]="!chatInput.trim() || sending()">
                  {{ sending() ? '…' : '➤' }}
                </button>
              </div>
            </div>
          }

          <!-- Actions -->
          <div class="action-area">
            @if (canCancel()) {
              <button class="danger" (click)="cancel()" [disabled]="cancelling()">
                {{ cancelling() ? 'Cancelling…' : 'Cancel Ride' }}
              </button>
            }
            @if (isTerminal()) {
              <a routerLink="/home" class="btn primary-btn">Request Another Ride</a>
              <a routerLink="/history" class="btn secondary">View Ride History</a>
            }
          </div>

        }
      </main>
    </div>
  `,
  styles: [`
    .ride-page { background: #f0f4f8; }
    .ride-content { max-width: 520px; margin: 0 auto; padding: 1rem; }

    .loading-card { text-align: center; padding: 3rem 1rem; }

    /* Status banner */
    .status-banner {
      border-radius: 14px; padding: 1rem 1.25rem;
      display: flex; align-items: flex-start; gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .status-banner.waiting   { background: #eff6ff; border: 1px solid #bfdbfe; }
    .status-banner.active    { background: #fefce8; border: 1px solid #fde047; }
    .status-banner.arrived   { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .status-banner.progress  { background: #ede9fe; border: 1px solid #c4b5fd; }
    .status-banner.done      { background: #f0fdf4; border: 1px solid #86efac; }
    .status-banner.cancelled { background: #fef2f2; border: 1px solid #fecaca; }
    .banner-icon { font-size: 2rem; flex-shrink: 0; }
    .banner-title { font-weight: 700; font-size: 1rem; margin-bottom: 0.2rem; color: #1e293b; }
    .banner-msg   { font-size: 0.88rem; color: #475569; }

    /* Steps */
    .steps-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      padding: 0.75rem 1rem; margin-bottom: 1rem;
    }
    .step {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.45rem 0; opacity: 0.35;
    }
    .step.done   { opacity: 1; }
    .step.active { opacity: 1; }
    .step-dot {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid #cbd5e1;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: #64748b; flex-shrink: 0;
    }
    .step.done .step-dot   { background: #22c55e; border-color: #22c55e; color: #fff; }
    .step.active .step-dot { border-color: #3b82f6; background: #eff6ff; }
    .pulse-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #3b82f6;
      animation: pulse 1.2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.6; }
    }
    .step-info { display: flex; align-items: center; gap: 0.4rem; }
    .step-icon  { font-size: 1rem; }
    .step-label { font-size: 0.88rem; font-weight: 500; color: #334155; }
    .step.active .step-label { color: #1d4ed8; font-weight: 700; }

    /* Trip details */
    .trip-details h3, .driver-card h3, .chat-card h3 {
      font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: #64748b; margin-bottom: 0.75rem;
    }
    .detail-row { display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.75rem; }
    .detail-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 2px; }
    .detail-label { font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.1rem; }
    .detail-val   { font-size: 0.95rem; font-weight: 500; color: #1e293b; }
    .fare-val { color: #2563eb; font-weight: 700; font-size: 1.1rem; }

    /* Driver card */
    .driver-card { margin-bottom: 1rem; }
    .driver-row { display: flex; align-items: center; gap: 0.75rem; }
    .driver-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: #3b82f6; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; font-weight: 700; flex-shrink: 0;
    }
    .driver-info { flex: 1; min-width: 0; }
    .driver-name    { font-weight: 700; font-size: 1rem; color: #1e293b; }
    .driver-vehicle { font-size: 0.82rem; color: #64748b; margin-top: 0.15rem; }
    .call-btn {
      display: inline-flex; align-items: center; gap: 0.3rem;
      padding: 0.45rem 0.85rem; background: #22c55e; color: #fff;
      border-radius: 20px; text-decoration: none; font-weight: 700;
      font-size: 0.85rem; white-space: nowrap; flex-shrink: 0;
    }
    .call-btn:hover { background: #16a34a; }

    /* Chat */
    .chat-card { margin-bottom: 1rem; padding-bottom: 0.75rem; }
    .chat-messages {
      max-height: 220px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 0.5rem;
      padding: 0.5rem 0; margin-bottom: 0.75rem;
    }
    .no-msgs { font-size: 0.85rem; color: #94a3b8; text-align: center; padding: 1rem 0; }
    .msg { display: flex; flex-direction: column; max-width: 80%; }
    .msg.mine { align-self: flex-end; align-items: flex-end; }
    .msg-sender { font-size: 0.72rem; color: #94a3b8; margin-bottom: 0.15rem; }
    .msg-bubble {
      padding: 0.5rem 0.85rem; border-radius: 16px;
      font-size: 0.9rem; line-height: 1.4;
      background: #e2e8f0; color: #1e293b;
      word-break: break-word;
    }
    .msg.mine .msg-bubble { background: #3b82f6; color: #fff; }
    .msg-time { font-size: 0.7rem; color: #94a3b8; margin-top: 0.15rem; }
    .chat-input-row { display: flex; gap: 0.5rem; align-items: center; }
    .chat-input-row input {
      flex: 1; margin: 0; padding: 0.6rem 0.85rem;
      border: 1.5px solid #e2e8f0; border-radius: 24px;
      font-size: 0.9rem;
    }
    .send-btn {
      width: 40px; height: 40px; border-radius: 50%;
      background: #3b82f6; color: #fff; border: none;
      font-size: 1rem; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      flex-shrink: 0; margin: 0; padding: 0;
    }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Actions */
    .action-area { margin-top: 0.5rem; margin-bottom: 2rem; }
    .primary-btn { display: block; text-align: center; padding: 0.75rem 1rem; }

    /* Scheduled banner */
    .sched-banner {
      display: flex; align-items: center; gap: 0.75rem;
      background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 12px;
      padding: 0.85rem 1rem; margin-bottom: 1rem;
    }
    .sched-icon { font-size: 1.6rem; flex-shrink: 0; }
    .sched-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.4px; color: #7c3aed; }
    .sched-time { font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-top: 0.1rem; }

    /* Mobile */
    @media (max-width: 480px) {
      .topbar { padding: 0.65rem 1rem; }
      .ride-content { padding: 0.75rem; }
      .steps-card { padding: 0.5rem 0.75rem; }
    }
  `],
})
export class ActiveRidePage implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatBox') chatBox?: ElementRef<HTMLDivElement>;

  ride = signal<RideRequest | null>(null);
  messages = signal<RideMessage[]>([]);
  chatInput = '';
  sending = signal(false);
  cancelling = signal(false);
  steps = STEPS;

  activeSteps(): Step[] {
    return this.ride()?.scheduledAt ? SCHED_STEPS : STEPS;
  }

  private pollRide?: Subscription;
  private pollMsgs?: Subscription;
  private shouldScrollChat = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rides: RideService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;

    // Load immediately, then poll every 4s
    this.rides.getRide(id).subscribe(r => this.ride.set(r));
    this.pollRide = interval(4000).pipe(switchMap(() => this.rides.getRide(id))).subscribe({
      next: r => {
        this.ride.set(r);
        if (this.isTerminal()) this.stopPolls();
      },
      error: () => {},
    });

    // Poll messages once driver is assigned (check every 5s)
    this.pollMsgs = interval(5000).pipe(switchMap(() => this.rides.getMessages(id))).subscribe({
      next: msgs => {
        const prev = this.messages().length;
        this.messages.set(msgs);
        if (msgs.length > prev) this.shouldScrollChat = true;
      },
      error: () => {},
    });
  }

  ngOnDestroy() { this.stopPolls(); }

  ngAfterViewChecked() {
    if (this.shouldScrollChat && this.chatBox) {
      const el = this.chatBox.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
    }
  }

  // Status helpers
  bannerClass() {
    const s = this.ride()?.status ?? '';
    if (['completed'].includes(s)) return 'done';
    if (TERMINAL.includes(s) && s !== 'completed') return 'cancelled';
    if (['trip_in_progress'].includes(s)) return 'progress';
    if (['driver_arrived', 'rider_checked_in'].includes(s)) return 'arrived';
    if (['driver_accepted', 'driver_enroute_pickup'].includes(s)) return 'active';
    return 'waiting';
  }

  bannerIcon() {
    const icons: Record<string, string> = {
      requested: '⏳', searching_driver: '🔍', offer_pending: '📨',
      driver_accepted: '✅', driver_enroute_pickup: '🚗', driver_arrived: '📍',
      rider_checked_in: '👋', trip_in_progress: '🎯', completed: '🎉',
      cancelled_by_rider: '❌', cancelled_by_driver: '😔',
      cancelled_by_admin: '🚫', expired_unassigned: '😕',
    };
    return icons[this.ride()?.status ?? ''] ?? '⏳';
  }

  bannerTitle() {
    const titles: Record<string, string> = {
      requested: 'Ride Requested', searching_driver: 'Finding Your Driver',
      offer_pending: 'Driver Found!', driver_accepted: 'Driver Confirmed',
      driver_enroute_pickup: 'Driver On The Way', driver_arrived: 'Driver Arrived!',
      rider_checked_in: 'Trip Starting', trip_in_progress: 'Trip In Progress',
      completed: 'Trip Complete!', cancelled_by_rider: 'Ride Cancelled',
      cancelled_by_driver: 'Driver Cancelled', cancelled_by_admin: 'Ride Cancelled',
      expired_unassigned: 'No Drivers Available',
    };
    return titles[this.ride()?.status ?? ''] ?? 'In Progress';
  }

  statusMsg() { return STATUS_MSG[this.ride()?.status ?? ''] ?? ''; }

  stepIndex(): number {
    const s = this.ride()?.status ?? '';
    const idx = this.activeSteps().findIndex(st => st.key === s);
    return idx >= 0 ? idx : 0;
  }

  stepDone(i: number) { return i < this.stepIndex(); }
  stepActive(i: number) { return i === this.stepIndex() && !this.isTerminal(); }

  canCancel() {
    const s = this.ride()?.status;
    return s && ['requested','searching_driver','offer_pending','driver_accepted','driver_enroute_pickup'].includes(s);
  }
  isTerminal() { return TERMINAL.includes(this.ride()?.status ?? ''); }
  isCancelled() {
    const s = this.ride()?.status ?? '';
    return s.startsWith('cancelled') || s === 'expired_unassigned';
  }

  cancel() {
    const id = this.ride()?.id; if (!id) return;
    this.cancelling.set(true);
    this.rides.cancelRide(id).subscribe({
      next: r => { this.ride.set(r); this.cancelling.set(false); },
      error: () => this.cancelling.set(false),
    });
  }

  sendMessage() {
    const text = this.chatInput.trim();
    const id = this.ride()?.id;
    if (!text || !id) return;
    this.sending.set(true);
    this.chatInput = '';
    this.rides.sendMessage(id, text).subscribe({
      next: msg => {
        this.messages.update(m => [...m, msg]);
        this.shouldScrollChat = true;
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }

  private stopPolls() {
    this.pollRide?.unsubscribe();
    this.pollMsgs?.unsubscribe();
  }
}
