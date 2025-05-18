import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./game.component').then(c => c.GameComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./game-current/game-current.component').then(c => c.GameCurrentComponent),
        pathMatch: 'full'
      },
      {
        path: 'ledger',
        loadComponent: () => import('./game-ledger/game-ledger.component').then(c => c.GameLedgerComponent)
      },
      {
        path: 'refer',
        loadComponent: () => import('./game-refer-friend/game-refer-friend.component').then(c => c.GameReferFriendComponent)
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GameRoutingModule { }
