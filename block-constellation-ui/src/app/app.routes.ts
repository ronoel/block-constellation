import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/home/home-routing.module').then(m => m.HomeRoutingModule),
        pathMatch: 'full'
    }
];
