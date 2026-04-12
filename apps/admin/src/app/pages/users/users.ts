import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../../core/admin.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <header class="topbar">
        <span class="brand">CommunityRide Admin</span>
        <nav><a routerLink="/dashboard">← Dashboard</a></nav>
      </header>

      <main class="content">
        <h1>Users</h1>

        <div class="card" style="padding:0; overflow:hidden;">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td>{{ u.name }}</td>
                  <td>{{ u.email }}</td>
                  <td><span class="status-badge">{{ u.role }}</span></td>
                  <td><span class="status-badge" [class]="u.status">{{ u.status }}</span></td>
                  <td>{{ u.createdAt | date:'mediumDate' }}</td>
                  <td>
                    @if (u.status === 'active') {
                      <button class="danger" (click)="suspend(u.id)">Suspend</button>
                    }
                    @if (u.status === 'suspended') {
                      <button (click)="activate(u.id)">Activate</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (users().length === 0) { <p class="empty">No users found.</p> }
      </main>
    </div>
  `,
})
export class UsersPage implements OnInit {
  users = signal<any[]>([]);
  constructor(private admin: AdminApiService) {}
  ngOnInit() { this.admin.getUsers().subscribe(u => this.users.set(u)); }

  suspend(id: string) {
    this.admin.suspendUser(id).subscribe(() =>
      this.users.update(list => list.map(u => u.id === id ? { ...u, status: 'suspended' } : u))
    );
  }

  activate(id: string) {
    this.admin.activateUser(id).subscribe(() =>
      this.users.update(list => list.map(u => u.id === id ? { ...u, status: 'active' } : u))
    );
  }
}
