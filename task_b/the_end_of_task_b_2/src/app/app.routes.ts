import { Routes } from '@angular/router';
import { authGuardGuard } from './core/guards/auth.guard-guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
    },
    {
        path: 'login',
        loadComponent: () => import('./features/login/login.component/login.component').then(m => m.LoginComponent),
        canActivate: [noAuthGuard],
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard.component/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [authGuardGuard],
        data: { redirectTo: '/login' },
    },
    {
        path: '**',
        redirectTo: 'login',
    },
];