import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-header.component.html',
  styleUrl: './game-header.component.scss'
})
export class GameHeaderComponent {
  @Input() walletConnected = false;
  @Input() walletAddress = '';
  @Input() networkType = 'Mainnet';
  @Input() showNetworkMismatch = false;
  
  @Output() toggleWallet = new EventEmitter<void>();
  
  toggleWalletConnection(): void {
    this.toggleWallet.emit();
  }
}
