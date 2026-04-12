import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from './env';

export interface RideRequest {
  id: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  passengerCount: number;
  fareEstimate: number | null;
  requestedAt: string;
  scheduledAt?: string | null;
  // Driver info (present once driver is assigned)
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  vehiclePlate?: string;
}

export interface UpcomingRide {
  id: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  passengerCount: number;
  fareEstimate: number | null;
  scheduledAt: string;
  requestedAt: string;
  driverName?: string;
  vehicleInfo?: string;
  vehiclePlate?: string;
}

export interface RideMessage {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface CreateRideDto {
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropLat: number;
  dropLng: number;
  dropAddress: string;
  passengerCount: number;
  scheduledAt?: string;
}

@Injectable({ providedIn: 'root' })
export class RideService {
  constructor(private http: HttpClient) {}

  requestRide(dto: CreateRideDto) {
    return this.http.post<RideRequest>(`${API}/rides`, dto);
  }

  getMyRides() {
    return this.http.get<RideRequest[]>(`${API}/rides/mine`);
  }

  getMyActiveRide() {
    return this.http.get<RideRequest | null>(`${API}/rides/my-active`);
  }

  getMyUpcoming() {
    return this.http.get<UpcomingRide[]>(`${API}/rides/my-upcoming`);
  }

  getRide(id: string) {
    return this.http.get<RideRequest>(`${API}/rides/${id}`);
  }

  cancelRide(id: string) {
    return this.http.post<RideRequest>(`${API}/rides/${id}/cancel`, {});
  }

  getMessages(rideId: string) {
    return this.http.get<RideMessage[]>(`${API}/rides/${rideId}/messages`);
  }

  sendMessage(rideId: string, message: string) {
    return this.http.post<RideMessage>(`${API}/rides/${rideId}/messages`, { message });
  }
}
