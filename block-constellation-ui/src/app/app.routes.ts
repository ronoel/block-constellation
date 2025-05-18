import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./pages/home/home-routing.module').then(m => m.HomeRoutingModule),
        pathMatch: 'full'
    },
    {
        path: 'play',
        loadChildren: () => import('./pages/game/game-routing.module').then(m => m.GameRoutingModule)
    },
    {
        path: 'game',
        redirectTo: 'play',
        pathMatch: 'full'
    },
];
