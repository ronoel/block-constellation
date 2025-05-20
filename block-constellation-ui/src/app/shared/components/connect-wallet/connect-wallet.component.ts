import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-connect-wallet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connect-wallet.component.html',
  styleUrl: './connect-wallet.component.scss'
})
export class ConnectWalletComponent {
  @Input() title: string = 'Connect to the Cosmos';
  @Input() description: string = 'Please connect your wallet to continue';
  @Input() buttonText: string = 'Connect Wallet';
  @Output() connectWallet = new EventEmitter<void>();
  
  onConnectClick(): void {
    this.connectWallet.emit();
  }
}
