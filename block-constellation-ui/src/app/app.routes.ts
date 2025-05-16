import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./pages/home/home-routing.module').then(m => m.HomeRoutingModule),
        pathMatch: 'full'
    }
];
