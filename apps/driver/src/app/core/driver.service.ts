import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from './env';

export interface DriverSession {
  id: string; isOnline: boolean; vehicleId: string; shiftStartedAt: string;
  vehicle?: { make: string; model: string; plate: string; };
}

export interface Vehicle {
  id: string; make: string; model: string; year: number;
  plate: string; color: string; seatCapacity: number;
}

export interface CreateVehicleDto {
  make: string; model: string; year: number;
  plate: string; color: string; seatCapacity: number; insuranceExpiry: string;
}

export interface Offer {
  id: string; rideRequestId: string; expiresAt: string; response: string;
  rideRequest?: {
    pickupAddress: string; dropAddress: string;
    fareEstimate: number | null; passengerCount: number;
  };
}

export interface ActiveRide {
  id: string; status: string; pickupAddress: string; dropAddress: string;
  fareEstimate: number | null; riderNameSnapshot: string; riderPhoneSnapshot: string;
}

export interface AvailableRide {
  id: string; status: string; pickupAddress: string; dropAddress: string;
  fareEstimate: number | null; passengerCount: number; requestedAt: string;
  scheduledAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DriverService {
  constructor(private http: HttpClient) {}

  // Vehicles
  getVehicles() { return this.http.get<Vehicle[]>(`${API}/vehicles`); }
  addVehicle(dto: CreateVehicleDto) { return this.http.post<Vehicle>(`${API}/vehicles`, dto); }
  removeVehicle(id: string) { return this.http.delete(`${API}/vehicles/${id}`); }

  // Sessions
  getActiveSession() { return this.http.get<DriverSession | null>(`${API}/driver-sessions/active`); }
  goOnline(vehicleId: string) { return this.http.post<DriverSession>(`${API}/driver-sessions/online`, { vehicleId }); }
  goOffline() { return this.http.post<void>(`${API}/driver-sessions/offline`, {}); }
  heartbeat() { return this.http.post<void>(`${API}/driver-sessions/heartbeat`, {}); }

  // Offers — driver polls this every few seconds while online
  getPendingOffer() { return this.http.get<Offer | null>(`${API}/dispatch/offers/pending`); }
  respondToOffer(offerId: string, accepted: boolean) {
    return this.http.post<any>(`${API}/dispatch/offers/${offerId}/respond`, { accepted });
  }

  // Available rides (driver browses & self-assigns)
  getAvailableRides() { return this.http.get<AvailableRide[]>(`${API}/rides/available`); }
  acceptRide(rideId: string) { return this.http.post<ActiveRide>(`${API}/rides/${rideId}/accept`, {}); }

  // Scheduled (advance) rides
  getScheduledRides() { return this.http.get<AvailableRide[]>(`${API}/rides/scheduled`); }

  // Ride lifecycle
  getRide(id: string) { return this.http.get<ActiveRide>(`${API}/rides/${id}`); }
  markEnroute(id: string) { return this.http.post<ActiveRide>(`${API}/rides/${id}/enroute`, {}); }
  markArrived(id: string) { return this.http.post<ActiveRide>(`${API}/rides/${id}/arrived`, {}); }
  startTrip(id: string) { return this.http.post<ActiveRide>(`${API}/rides/${id}/start`, {}); }
  completeTrip(id: string) { return this.http.post<ActiveRide>(`${API}/rides/${id}/complete`, {}); }

  // Chat
  getMessages(rideId: string) { return this.http.get<any[]>(`${API}/rides/${rideId}/messages`); }
  sendMessage(rideId: string, message: string) {
    return this.http.post<any>(`${API}/rides/${rideId}/messages`, { message });
  }
}
