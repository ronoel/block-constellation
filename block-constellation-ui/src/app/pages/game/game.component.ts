import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { GameHeaderComponent, NavItem } from './game-header/game-header.component';
import { GameFooterComponent } from './game-footer/game-footer.component';
import { GameCurrentComponent } from './game-current/game-current.component';
import { GameLedgerComponent } from './game-ledger/game-ledger.component';
import { GameReferFriendComponent } from './game-refer-friend/game-refer-friend.component';
import { WalletService } from '../../libs/wallet.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GameHeaderComponent,
    GameFooterComponent,
    GameCurrentComponent,
    GameLedgerComponent,
    GameReferFriendComponent
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent {
  // Navigation items
  navigationItems: NavItem[] = [
    { label: 'Star Former', description: '(Stake)', route: '/play', active: true },
    { label: 'Star Ledger', description: '(Claim your reward)', route: '/play/ledger', active: false },
    { label: 'Refer Friend', description: '(Earn rewards)', route: '/play/refer', active: false }
  ];
  
  // Active view tracking
  activeView: 'current' | 'ledger' | 'refer' = 'current';
  
  // UI states
  showNetworkMismatch = false;
  
  // Footer links
  footerLinks = [
    { label: 'About', route: '/about' },
    { label: 'Rules', route: '/rules' },
    { label: 'FAQ', route: '/faq' },
    { label: 'Support', url: 'mailto:support@blockconstellation.com', isExternal: true },
    { label: 'Twitter', url: 'https://twitter.com/blockconstellation', isExternal: true },
    { label: 'Discord', url: 'https://discord.gg/blockconstellation', isExternal: true }
  ];

  footerCopyright = '© 2025 Block Constellation - All rights reserved';
  
  // Service injection
  private router = inject(Router);
  public walletService = inject(WalletService);
  
  // Navigation handler method
  handleNavItemClick(navItem: NavItem): void {
    // Update active state in navigation items
    this.navigationItems.forEach(item => {
      item.active = item.label === navItem.label;
    });
    
    // Navigate to the route if defined
    if (navItem.route) {
      this.router.navigateByUrl(navItem.route);
    }
  }
  
  // Theme toggle handler
  handleThemeToggle(theme: 'light' | 'dark'): void {
    console.log(`Theme changed to ${theme} mode`);
    // Here you could perform additional actions when theme changes
  }
}
