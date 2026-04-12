import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login',    loadComponent: () => import('./pages/login/login').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then(m => m.RegisterPage) },
  { path: 'home',            canActivate: [authGuard], loadComponent: () => import('./pages/home/home').then(m => m.HomePage) },
  { path: 'active-ride/:id', canActivate: [authGuard], loadComponent: () => import('./pages/active-ride/active-ride').then(m => m.ActiveRidePage) },
  { path: 'history',         canActivate: [authGuard], loadComponent: () => import('./pages/history/history').then(m => m.HistoryPage) },
  { path: 'profile',         canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.ProfilePage) },
  { path: '**', redirectTo: 'home' },
];
