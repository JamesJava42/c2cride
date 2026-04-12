import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login',    loadComponent: () => import('./pages/login/login').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then(m => m.RegisterPage) },
  { path: 'dashboard',       canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage) },
  { path: 'active-ride/:id', canActivate: [authGuard], loadComponent: () => import('./pages/active-ride/active-ride').then(m => m.ActiveRidePage) },
  { path: 'profile',         canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.ProfilePage) },
  { path: '**', redirectTo: 'dashboard' },
];
