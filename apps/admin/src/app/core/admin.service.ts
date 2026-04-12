import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from './env';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private http: HttpClient) {}

  getStats() { return this.http.get<Record<string, number>>(`${API}/admin/stats`); }
  getUsers() { return this.http.get<any[]>(`${API}/users`); }
  getDrivers() { return this.http.get<any[]>(`${API}/drivers`); }
  getActiveRides() { return this.http.get<any[]>(`${API}/rides/active`); }
  getIncidents() { return this.http.get<any[]>(`${API}/admin/incidents`); }
  getActions() { return this.http.get<any[]>(`${API}/admin/actions`); }

  approveDriver(id: string) { return this.http.post(`${API}/drivers/${id}/approve`, {}); }
  rejectDriver(id: string) { return this.http.post(`${API}/drivers/${id}/reject`, {}); }
  suspendUser(id: string) { return this.http.patch(`${API}/users/${id}/suspend`, {}); }
  activateUser(id: string) { return this.http.patch(`${API}/users/${id}/activate`, {}); }
  cancelRide(id: string) { return this.http.post(`${API}/rides/${id}/admin-cancel`, {}); }
  resetRideForRedispatch(id: string) { return this.http.post(`${API}/rides/${id}/reset`, {}); }
  getNeedsAttentionRides() { return this.http.get<any[]>(`${API}/rides/needs-attention`); }
  resolveIncident(id: string) { return this.http.post(`${API}/admin/incidents/${id}/resolve`, {}); }
  dispatchRide(id: string) { return this.http.post(`${API}/dispatch/rides/${id}/dispatch`, {}); }
}
