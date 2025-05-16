import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface FooterLink {
  label: string;
  route?: string;
  url?: string;
  isExternal?: boolean;
}

@Component({
  selector: 'app-game-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './game-footer.component.html',
  styleUrl: './game-footer.component.scss'
})
export class GameFooterComponent {
  @Input() links: FooterLink[] = [
    { label: 'About', route: '/about' },
    { label: 'Rules', route: '/rules' },
    { label: 'FAQ', route: '/faq' },
    { label: 'Support', url: 'mailto:support@blockconstellation.com', isExternal: true },
    { label: 'Twitter', url: 'https://twitter.com/blockconstellation', isExternal: true },
    { label: 'Discord', url: 'https://discord.gg/blockconstellation', isExternal: true }
  ];
  
  @Input() copyrightText = '© 2025 Block Constellation';
  
  // Method to handle opening external links
  openExternalLink(url: string): void {
    window.open(url, '_blank');
  }
}
