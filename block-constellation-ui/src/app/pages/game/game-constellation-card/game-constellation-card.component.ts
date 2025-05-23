import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Interface for constellation data
interface Constellation {
  id: number;
  name: string;
  meaning: string;
  totalStaked: number;
  yourStake: number;
  yourShare: number;
}

@Component({
  selector: 'app-game-constellation-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-constellation-card.component.html',
  styleUrl: './game-constellation-card.component.scss'
})
export class GameConstellationCardComponent {
  // Math utility for use in template
  Math = Math;
  
  @Input() constellation!: Constellation;
  @Input() walletConnected: boolean = false;
  @Input() hasPendingTransaction: boolean = false;
  
  @Output() selectCard = new EventEmitter<Constellation>();
  
  onCardClick(): void {
    if (this.walletConnected) {
      this.selectCard.emit(this.constellation);
    }
  }
  
  formatSats(sats: number): string {
    if (sats === undefined || sats === null || isNaN(sats) || sats < 0) {
      return '0';
    }
    return Math.floor(sats).toLocaleString();
  }

  formatBTC(btc: number): string {
    if (btc === undefined || btc === null || isNaN(btc) || btc < 0) {
      return '0.00000000';
    }
    return btc.toFixed(8);
  }
}
