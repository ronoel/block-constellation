import { Component, Output, EventEmitter, Input, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WalletService } from '../../../libs/wallet.service';

export interface NavItem {
  label: string;
  description: string;
  route?: string;
  url?: string;
  active?: boolean;
}

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './game-header.component.html',
  styleUrl: './game-header.component.scss'
})
export class GameHeaderComponent implements OnInit {
  @Input() showNetworkMismatch = false;
  @Input() navItems: NavItem[] = [
    { label: 'Star Former', description: '(Stake)', route: '/star-former', active: true },
    { label: 'Star Ledger', description: '(Claim your reward)', route: '/star-ledger' }
  ];
  
  @Output() navItemClick = new EventEmitter<NavItem>();
  @Output() themeToggle = new EventEmitter<'light' | 'dark'>();
  
  // Wallet state
  walletConnected = false;
  walletAddress = '';
  networkType = 'Mainnet';
  
  // Theme state
  isDarkTheme = true;
  
  // Service injection
  private walletService = inject(WalletService);
  
  // Disconnect dialog state
  showDisconnectDialog = false;
  
  constructor() {
    // Monitor wallet connection state
    effect(() => {
      if (this.walletService.isLoggedIn()) {
        this.walletConnected = true;
        this.walletAddress = this.walletService.getSTXAddress();
        this.networkType = this.walletService.getNetwork() === 'mainnet' ? 'Mainnet' : 'Testnet';
      } else {
        this.walletConnected = false;
        this.walletAddress = '';
      }
    });
  }
  
  ngOnInit(): void {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme !== 'light';
    this.applyTheme();
  }
  
  // Methods for handling wallet disconnection
  toggleWalletConnection(): void {
    if (this.walletConnected) {
      this.showDisconnectDialog = true;
    } else {
      this.walletService.signIn();
    }
  }
  
  cancelDisconnect(): void {
    this.showDisconnectDialog = false;
  }
  
  confirmDisconnect(): void {
    this.walletService.signOut();
    this.showDisconnectDialog = false;
  }
  
  onNavItemClick(item: NavItem): void {
    // If it's an external URL, don't emit the event
    if (item.url && !item.route) {
      return;
    }
    
    this.navItems.forEach(navItem => navItem.active = (navItem === item));
    this.navItemClick.emit(item);
  }
  
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    this.themeToggle.emit(this.isDarkTheme ? 'dark' : 'light');
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }
  
  private applyTheme(): void {
    document.body.classList.toggle('light-theme', !this.isDarkTheme);
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }
}
