import {
  Component, OnInit, OnDestroy, signal,
  ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DriverService, ActiveRide } from '../../core/driver.service';
import { AuthService } from '../../core/auth.service';

export interface ActiveRideExtended extends ActiveRide {
  scheduledAt?: string | null;
}

export interface RideMessage {
  id: string; senderId: string; senderRole: string;
  senderName: string; body: string; createdAt: string;
}

const ACTION: Partial<Record<string, { label: string; next: (svc: DriverService, id: string) => any }>> = {
  driver_accepted:       { label: 'Start driving to pickup',   next: (s, id) => s.markEnroute(id) },
  driver_enroute_pickup: { label: 'I have arrived at pickup',  next: (s, id) => s.markArrived(id) },
  driver_arrived:        { label: 'Start trip',                next: (s, id) => s.startTrip(id) },
  rider_checked_in:      { label: 'Start trip',                next: (s, id) => s.startTrip(id) },
  trip_in_progress:      { label: 'Complete trip',             next: (s, id) => s.completeTrip(id) },
};

const STATUS_LABEL: Record<string, string> = {
  driver_accepted:       'Head to pickup',
  driver_enroute_pickup: 'En route to pickup',
  driver_arrived:        'Waiting for rider',
  rider_checked_in:      'Rider checked in',
  trip_in_progress:      'Trip in progress',
  completed:             'Trip completed',
};

@Component({
  selector: 'app-active-ride',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">Driver — CommunityRide</span>
        @if (ride()?.status === 'completed') {
          <a routerLink="/dashboard">← Dashboard</a>
        }
      </header>

      <main class="content">
        @if (!ride()) {
          <div style="text-align:center;padding:3rem">
            <div class="spinner"></div>
            <p class="hint">Loading ride…</p>
          </div>
        } @else {

          <!-- Status -->
          <!-- Scheduled pickup banner -->
          @if (ride()!.scheduledAt && ride()!.status === 'driver_accepted') {
            <div class="sched-banner">
              <span style="font-size:1.5rem">🗓</span>
              <div>
                <p class="sched-label">Scheduled pickup</p>
                <p class="sched-time">{{ ride()!.scheduledAt | date:'EEEE, MMM d · h:mm a' }}</p>
                @if (minsUntilPickup() > 60) {
                  <p class="sched-hint">You can start driving within 60 min of pickup. Come back in {{ waitMins() }} min.</p>
                }
              </div>
            </div>
          }

          <div class="card" style="margin-bottom:0.75rem">
            <div class="status-pill" [class]="ride()!.status">
              {{ statusLabel() }}
            </div>
            @if (actionFor() && !pickupTooEarly()) {
              <button (click)="doAction()" [disabled]="acting()" style="margin-top:1rem">
                {{ acting() ? 'Updating…' : actionFor()!.label }}
              </button>
            }
            @if (actionFor() && pickupTooEarly()) {
              <div class="early-notice">
                ⏰ Come back {{ waitMins() }} min before pickup to start driving.
              </div>
            }
            @if (ride()!.status === 'completed') {
              <p class="success" style="margin-top:0.75rem;font-size:1rem">
                Trip complete! Great job.
              </p>
              <a routerLink="/dashboard" class="btn" style="margin-top:0.75rem;display:block;text-align:center">
                Back to Dashboard
              </a>
            }
          </div>

          <!-- Rider info -->
          <div class="card" style="margin-bottom:0.75rem">
            <h3 style="font-size:0.8rem;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:.75rem">
              Rider
            </h3>
            <div style="display:flex;align-items:center;gap:.75rem">
              <div class="rider-avatar">{{ ride()!.riderNameSnapshot.charAt(0).toUpperCase() }}</div>
              <div>
                <p style="font-weight:700;font-size:1rem">{{ ride()!.riderNameSnapshot }}</p>
                @if (ride()!.riderPhoneSnapshot) {
                  <a [href]="'tel:' + ride()!.riderPhoneSnapshot" class="phone-link">
                    📞 {{ ride()!.riderPhoneSnapshot }}
                  </a>
                }
              </div>
            </div>
            <hr style="margin:.75rem 0;border:none;border-top:1px solid #f1f5f9" />
            <p style="font-size:.85rem"><strong>Pickup:</strong> {{ ride()!.pickupAddress }}</p>
            <p style="font-size:.85rem;margin-top:.35rem"><strong>Drop-off:</strong> {{ ride()!.dropAddress }}</p>
            @if (ride()!.fareEstimate) {
              <p class="fare" style="margin-top:.5rem">Fare: {{ '$' + ride()!.fareEstimate }}</p>
            }
          </div>

          <!-- Chat -->
          @if (ride()!.status !== 'completed') {
            <div class="card chat-card">
              <h3 style="font-size:.8rem;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:.75rem">
                Message Rider
              </h3>
              <div class="chat-messages" #chatBox>
                @for (msg of messages(); track msg.id) {
                  <div class="msg" [class.mine]="msg.senderRole === 'driver'">
                    <span class="msg-sender">{{ msg.senderRole === 'driver' ? 'You' : msg.senderName }}</span>
                    <div class="msg-bubble">{{ msg.body }}</div>
                    <span class="msg-time">{{ msg.createdAt | date:'shortTime' }}</span>
                  </div>
                }
                @if (messages().length === 0) {
                  <p class="no-msgs">No messages yet.</p>
                }
              </div>
              <div class="chat-input-row">
                <input
                  [(ngModel)]="chatInput"
                  placeholder="Send a message…"
                  (keydown.enter)="sendMessage()"
                  maxlength="500"
                  autocomplete="off" />
                <button class="send-btn" (click)="sendMessage()" [disabled]="!chatInput.trim() || sending()">
                  {{ sending() ? '…' : '➤' }}
                </button>
              </div>
            </div>
          }

        }
      </main>
    </div>
  `,
  styles: [`
    .status-pill {
      display: inline-block; padding: .35rem .9rem; border-radius: 20px;
      font-size: .8rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .4px; background: #e2e8f0; color: #475569;
    }
    .status-pill.driver_accepted,
    .status-pill.driver_enroute_pickup { background: #fef9c3; color: #854d0e; }
    .status-pill.driver_arrived,
    .status-pill.rider_checked_in { background: #dbeafe; color: #1d4ed8; }
    .status-pill.trip_in_progress { background: #ede9fe; color: #6d28d9; }
    .status-pill.completed { background: #dcfce7; color: #16a34a; }

    .rider-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: #3b82f6; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; font-weight: 700; flex-shrink: 0;
    }
    .phone-link { color: #16a34a; text-decoration: none; font-size: .85rem; font-weight: 600; }
    .spinner {
      width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid #e2e8f0; border-top-color: #3b82f6;
      animation: spin .7s linear infinite; margin: 0 auto .5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Scheduled banner */
    .sched-banner {
      display: flex; align-items: flex-start; gap: .75rem;
      background: #1e1b4b; border: 1.5px solid #4338ca; border-radius: 12px;
      padding: .85rem 1rem; margin-bottom: .75rem;
    }
    .sched-label { font-size: .7rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .4px; color: #818cf8; }
    .sched-time { font-size: .92rem; font-weight: 700; color: #f1f5f9; margin-top: .1rem; }
    .sched-hint { font-size: .78rem; color: #6366f1; margin-top: .25rem; }
    .early-notice {
      background: #1e1b4b; border-radius: 8px; padding: .6rem .85rem;
      color: #a5b4fc; font-size: .85rem; font-weight: 600; margin-top: .75rem;
    }

    /* Chat */
    .chat-card { padding-bottom: .75rem; }
    .chat-messages {
      max-height: 200px; overflow-y: auto;
      display: flex; flex-direction: column; gap: .4rem;
      padding: .25rem 0; margin-bottom: .75rem;
    }
    .no-msgs { font-size: .82rem; color: #94a3b8; text-align: center; padding: .75rem 0; }
    .msg { display: flex; flex-direction: column; max-width: 80%; }
    .msg.mine { align-self: flex-end; align-items: flex-end; }
    .msg-sender { font-size: .7rem; color: #94a3b8; margin-bottom: .1rem; }
    .msg-bubble {
      padding: .45rem .8rem; border-radius: 14px;
      font-size: .88rem; line-height: 1.4;
      background: #e2e8f0; color: #1e293b;
      word-break: break-word;
    }
    .msg.mine .msg-bubble { background: #3b82f6; color: #fff; }
    .msg-time { font-size: .68rem; color: #94a3b8; margin-top: .1rem; }
    .chat-input-row { display: flex; gap: .5rem; align-items: center; }
    .chat-input-row input {
      flex: 1; margin: 0; padding: .55rem .8rem;
      border: 1.5px solid #e2e8f0; border-radius: 22px; font-size: .88rem;
    }
    .send-btn {
      width: 38px; height: 38px; border-radius: 50%; margin: 0; padding: 0;
      background: #3b82f6; color: #fff; border: none; font-size: .95rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .send-btn:disabled { opacity: .4; cursor: not-allowed; }
  `],
})
export class ActiveRidePage implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatBox') chatBox?: ElementRef<HTMLDivElement>;

  ride = signal<ActiveRideExtended | null>(null);
  messages = signal<RideMessage[]>([]);
  acting = signal(false);
  sending = signal(false);
  chatInput = '';
  private shouldScroll = false;
  private pollRide?: Subscription;
  private pollMsgs?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private driver: DriverService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.driver.getRide(id).subscribe(r => this.ride.set(r));

    // Poll ride status every 4s
    this.pollRide = interval(4000).pipe(switchMap(() => this.driver.getRide(id))).subscribe({
      next: r => {
        this.ride.set(r);
        if (r.status === 'completed') this.pollRide?.unsubscribe();
      },
      error: () => {},
    });

    // Poll messages every 5s
    this.driver.getMessages(id).subscribe(msgs => this.messages.set(msgs));
    this.pollMsgs = interval(5000).pipe(switchMap(() => this.driver.getMessages(id))).subscribe({
      next: msgs => {
        const prev = this.messages().length;
        this.messages.set(msgs);
        if (msgs.length > prev) this.shouldScroll = true;
      },
      error: () => {},
    });
  }

  ngOnDestroy() {
    this.pollRide?.unsubscribe();
    this.pollMsgs?.unsubscribe();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.chatBox) {
      const el = this.chatBox.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  statusLabel() { return STATUS_LABEL[this.ride()?.status ?? ''] ?? this.ride()?.status ?? ''; }
  actionFor() { return ACTION[this.ride()?.status ?? '']; }

  minsUntilPickup(): number {
    const t = this.ride()?.scheduledAt;
    if (!t) return 0;
    return Math.max(0, Math.round((new Date(t).getTime() - Date.now()) / 60000));
  }
  pickupTooEarly(): boolean { return this.minsUntilPickup() > 60; }
  waitMins(): number { return Math.max(0, this.minsUntilPickup() - 60); }

  doAction() {
    const r = this.ride(); const a = this.actionFor();
    if (!r || !a) return;
    this.acting.set(true);
    a.next(this.driver, r.id).subscribe({
      next: (updated: ActiveRide) => { this.ride.set(updated); this.acting.set(false); },
      error: () => this.acting.set(false),
    });
  }

  sendMessage() {
    const text = this.chatInput.trim();
    const id = this.ride()?.id;
    if (!text || !id) return;
    this.sending.set(true);
    this.chatInput = '';
    this.driver.sendMessage(id, text).subscribe({
      next: msg => {
        this.messages.update(m => [...m, msg]);
        this.shouldScroll = true;
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }
}
