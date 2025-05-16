import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
  @Input() walletConnected = false;
  @Input() walletAddress = '';
  @Input() networkType = 'Mainnet';
  @Input() showNetworkMismatch = false;
  @Input() navItems: NavItem[] = [
    { label: 'Star Former', description: '(Stake)', route: '/star-former', active: true },
    { label: 'Star Ledger', description: '(Claim your reward)', route: '/star-ledger' }
  ];
  
  @Output() toggleWallet = new EventEmitter<void>();
  @Output() navItemClick = new EventEmitter<NavItem>();
  @Output() themeToggle = new EventEmitter<'light' | 'dark'>();
  
  isDarkTheme = true;
  
  ngOnInit(): void {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme !== 'light';
    this.applyTheme();
  }
  
  toggleWalletConnection(): void {
    this.toggleWallet.emit();
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
