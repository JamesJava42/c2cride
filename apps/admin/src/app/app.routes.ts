import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginPage) },
  { path: 'dashboard',  canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage) },
  { path: 'users',      canActivate: [authGuard], loadComponent: () => import('./pages/users/users').then(m => m.UsersPage) },
  { path: 'drivers',    canActivate: [authGuard], loadComponent: () => import('./pages/drivers/drivers').then(m => m.DriversPage) },
  { path: 'rides',      canActivate: [authGuard], loadComponent: () => import('./pages/rides/rides').then(m => m.RidesPage) },
  { path: 'incidents',  canActivate: [authGuard], loadComponent: () => import('./pages/incidents/incidents').then(m => m.IncidentsPage) },
  { path: '**', redirectTo: 'dashboard' },
];
