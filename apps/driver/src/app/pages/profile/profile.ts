import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { DriverService, Vehicle } from '../../core/driver.service';
import { API } from '../../core/env';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">Driver — CommunityRide</span>
        <nav><a routerLink="/dashboard">← Dashboard</a></nav>
      </header>

      <main class="content">
        <h1>My Profile</h1>

        <!-- Personal info -->
        <div class="card">
          <h2>Personal Info</h2>
          <label>Name</label><input [(ngModel)]="name" />
          <label>Phone</label><input [(ngModel)]="phone" />
          <button (click)="savePersonal()" [disabled]="savingPersonal()">
            {{ savingPersonal() ? 'Saving…' : 'Save' }}
          </button>
          @if (savedPersonal()) { <p class="success">Saved!</p> }
        </div>

        <!-- Driver license info -->
        <div class="card">
          <h2>License Info</h2>
          <p class="hint">Required before admin approval. This info is reviewed by our team.</p>
          <label>License Number</label>
          <input [(ngModel)]="licenseNumber" placeholder="e.g. D1234567" />
          <label>License State / Province</label>
          <input [(ngModel)]="licenseState" placeholder="e.g. CA" />
          <button (click)="saveLicense()" [disabled]="savingLicense()">
            {{ savingLicense() ? 'Saving…' : 'Save License Info' }}
          </button>
          @if (savedLicense()) { <p class="success">License info saved!</p> }
          @if (licenseError()) { <p class="error">{{ licenseError() }}</p> }
        </div>

        <!-- Vehicles -->
        <div class="card">
          <h3>My Vehicles</h3>
          @for (v of vehicles(); track v.id) {
            <div class="vehicle-row">
              <span>{{ v.year }} {{ v.make }} {{ v.model }} — {{ v.plate }}</span>
            </div>
          }
          @if (vehicles().length === 0) { <p class="hint">No vehicles added yet.</p> }

          <h4 style="margin-top:1rem">Add Vehicle</h4>
          <label>Make</label><input [(ngModel)]="vMake" placeholder="e.g. Toyota" />
          <label>Model</label><input [(ngModel)]="vModel" placeholder="e.g. Camry" />
          <label>Year</label><input [(ngModel)]="vYear" type="number" />
          <label>Plate</label><input [(ngModel)]="vPlate" placeholder="e.g. ABC1234" />
          <label>Color</label><input [(ngModel)]="vColor" placeholder="Color" />
          <label>Seat Capacity</label><input [(ngModel)]="vSeats" type="number" placeholder="1–4" />
          <label>Insurance Expiry</label><input [(ngModel)]="vExpiry" type="date" />
          @if (vehicleError()) { <p class="error">{{ vehicleError() }}</p> }
          <button (click)="addVehicle()" [disabled]="addingVehicle()">
            {{ addingVehicle() ? 'Adding…' : 'Add Vehicle' }}
          </button>
        </div>

        <div class="card">
          <button class="danger" (click)="auth.logout()">Sign Out</button>
        </div>
      </main>
    </div>
  `,
})
export class ProfilePage implements OnInit {
  name = '';
  phone = '';
  licenseNumber = '';
  licenseState = '';
  savingPersonal = signal(false);
  savedPersonal = signal(false);
  savingLicense = signal(false);
  savedLicense = signal(false);
  licenseError = signal('');

  vehicles = signal<Vehicle[]>([]);
  vMake = ''; vModel = ''; vYear = 2020; vPlate = ''; vColor = ''; vSeats = 4; vExpiry = '';
  addingVehicle = signal(false);
  vehicleError = signal('');

  constructor(public auth: AuthService, private driver: DriverService, private http: HttpClient) {}

  ngOnInit() {
    this.name = this.auth.currentUser()?.name ?? '';
    this.phone = this.auth.currentUser()?.phone ?? '';
    this.driver.getVehicles().subscribe(v => this.vehicles.set(v));
    // Load existing driver profile (license info)
    this.http.get<any>(`${API}/drivers/me`).subscribe({
      next: d => {
        this.licenseNumber = d.licenseNumber ?? '';
        this.licenseState = d.licenseState ?? '';
      },
      error: () => {},
    });
  }

  savePersonal() {
    this.savingPersonal.set(true);
    this.http.patch(`${API}/users/me`, { name: this.name, phone: this.phone }).subscribe({
      next: () => {
        this.auth.loadProfile();
        this.savingPersonal.set(false);
        this.savedPersonal.set(true);
      },
      error: () => this.savingPersonal.set(false),
    });
  }

  saveLicense() {
    this.licenseError.set('');
    if (!this.licenseNumber.trim() || !this.licenseState.trim()) {
      this.licenseError.set('Both license number and state are required.');
      return;
    }
    this.savingLicense.set(true);
    this.http.patch(`${API}/drivers/profile`, {
      licenseNumber: this.licenseNumber.trim(),
      licenseState: this.licenseState.trim(),
    }).subscribe({
      next: () => { this.savingLicense.set(false); this.savedLicense.set(true); },
      error: e => {
        this.licenseError.set(e.error?.message ?? 'Failed to save license info');
        this.savingLicense.set(false);
      },
    });
  }

  addVehicle() {
    this.vehicleError.set('');
    if (!this.vMake || !this.vModel || !this.vPlate) {
      this.vehicleError.set('Make, model and plate are required.');
      return;
    }
    this.addingVehicle.set(true);
    this.driver.addVehicle({
      make: this.vMake, model: this.vModel, year: Number(this.vYear),
      plate: this.vPlate, color: this.vColor, seatCapacity: Number(this.vSeats),
      insuranceExpiry: this.vExpiry,
    }).subscribe({
      next: v => {
        this.vehicles.update(list => [...list, v]);
        this.vMake = this.vModel = this.vPlate = this.vColor = this.vExpiry = '';
        this.vYear = 2020; this.vSeats = 4;
        this.addingVehicle.set(false);
      },
      error: e => {
        this.vehicleError.set(e.error?.message ?? 'Failed to add vehicle');
        this.addingVehicle.set(false);
      },
    });
  }
}
