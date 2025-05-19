import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { GameHeaderComponent, NavItem } from './game-header/game-header.component';
import { GameFooterComponent } from './game-footer/game-footer.component';
import { WalletService } from '../../libs/wallet.service';
import { filter } from 'rxjs/operators';
import { TransactionNotificationsComponent } from '../../shared/components/transaction-notifications/transaction-notifications.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GameHeaderComponent,
    GameFooterComponent,
    TransactionNotificationsComponent
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit {
  // Navigation items
  navigationItems: NavItem[] = [
    { label: 'Star Former', description: '(Stake)', route: '/play', active: false },
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
  
  ngOnInit(): void {
    // Set the initial active menu item based on the current route
    this.setActiveNavFromUrl(this.router.url);
    
    // Subscribe to route changes to update the active menu item
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.setActiveNavFromUrl(event.url);
    });
  }
  
  // Helper method to set active navigation based on URL
  private setActiveNavFromUrl(url: string): void {
    // Reset all items to inactive first
    this.navigationItems.forEach(item => item.active = false);
    
    // Set the appropriate item to active based on the URL
    if (url.includes('/ledger')) {
      this.navigationItems[1].active = true; // Star Ledger
      this.activeView = 'ledger';
    } else if (url.includes('/refer')) {
      this.navigationItems[2].active = true; // Refer Friend
      this.activeView = 'refer';
    } else {
      this.navigationItems[0].active = true; // Star Former
      this.activeView = 'current';
    }
  }
  
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
