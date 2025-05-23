import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/wallet.service';
import { BlockConstellationContractService } from '../../../libs/block-constellation-contract.service';
import { sBTCTokenService } from '../../../libs/sbtc-token.service';
import { AllocateStatusService } from '../../../shared/services/allocate-status.service';
import { BinanceService } from '../../../libs/binance.service';
import { Subscription } from 'rxjs';

// Interface for the constellation
interface Constellation {
  id: number;
  name: string;
  meaning: string;
  totalStaked: number;
  yourStake: number;
  yourShare: number;
}

@Component({
  selector: 'app-game-stake-action',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './game-stake-action.component.html',
  styleUrl: './game-stake-action.component.scss'
})
export class GameStakeActionComponent implements OnInit, OnDestroy {
  // Math utility for use in template
  Math = Math;
  
  // Inputs
  private _isOpen: boolean = false;
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    // When drawer opens, reset the stake amount to the default 1000 sats
    if (value === true) {
      this.stakeAmount = 1000;
      this.statusMessage = '';
      this.statusType = '';
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  
  @Input() constellation: Constellation | null = null;
  @Input() feeBalance: number = 0;
  @Input() btcPrice: number = 0;
  
  // Outputs
  @Output() close = new EventEmitter<void>();
  @Output() stakeConfirmed = new EventEmitter<{amount: number, constellationId: number, txId: string}>();
  
  // Component state
  stakeAmount = 1000;
  statusMessage = '';
  statusType = '';
  isLoadingBalance = false;
  private subscriptions: Subscription[] = [];
  
  // Services
  constructor(
    private walletService: WalletService,
    private blockConstellationContractService: BlockConstellationContractService,
    private sbtcTokenService: sBTCTokenService,
    private allocateStatusService: AllocateStatusService,
    private binanceService: BinanceService
  ) {}
  
  ngOnInit(): void {
    // Initialize with minimum stake amount of 1000 sats
    this.stakeAmount = 1000;
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Close the drawer
  closeDrawer(): void {
    this.close.emit();
  }

  // Fetch the user's sBTC balance
  fetchUserBalance(): void {
    this.isLoadingBalance = true;
    
    const balanceSubscription = this.sbtcTokenService.getBalance().subscribe({
      next: (balance: bigint) => {
        this.feeBalance = Number(balance);
        this.isLoadingBalance = false;
        
        // If the current stake amount is more than available balance,
        // adjust it to either the maximum balance or the minimum stake amount
        if (this.stakeAmount > this.feeBalance) {
          if (this.feeBalance >= 1000) {
            this.stakeAmount = this.feeBalance;
          } else {
            this.stakeAmount = 1000; // Keep minimum even if they can't afford it
          }
        }
      },
      error: (error: Error) => {
        console.error('Error fetching sBTC balance:', error);
        this.isLoadingBalance = false;
        this.statusMessage = 'Could not verify your balance. Please try again.';
        this.statusType = 'error';
        this.clearStatusMessageAfterDelay();
      }
    });
    
    this.subscriptions.push(balanceSubscription);
  }

  // Submit stake to the blockchain
  confirmStake(): void {
    if (this.constellation && this.stakeAmount >= 1000 && this.stakeAmount <= this.feeBalance) {
      this.statusMessage = 'Submitting your stake...';
      this.statusType = 'info';
      
      const stakeSubscription = this.blockConstellationContractService
        .allocate(this.stakeAmount, this.constellation.id)
        .subscribe({
          next: (response: any) => {
            if (response.txid && this.constellation) {
              // Add transaction to tracking service
              this.allocateStatusService.addAllocationTransaction(
                response.txid,
                this.stakeAmount,
                this.constellation.id
              );
              
              // Emit event to parent component
              this.stakeConfirmed.emit({
                amount: this.stakeAmount,
                constellationId: this.constellation.id,
                txId: response.txid
              });
              
              const constellationName = this.constellation?.name || 'unknown';
              this.statusMessage = `Stake of ${this.formatSats(this.stakeAmount)} sats successfully submitted to the ${constellationName} constellation! Your transaction is now processing.`;
              this.statusType = 'success';
              this.clearStatusMessageAfterDelay(8000);
              this.closeDrawer();
            }
          },
          error: (error: Error) => {
            this.statusMessage = `Failed to stake on constellation: ${error.message || 'Unknown error'}`;
            this.statusType = 'error';
            this.clearStatusMessageAfterDelay();
          }
        });
        
      this.subscriptions.push(stakeSubscription);
    } else {
      if (this.feeBalance < 1000) {
        this.statusMessage = 'Insufficient sBTC balance. You need at least 1000 sats to stake.';
      } else if (this.stakeAmount > this.feeBalance) {
        this.statusMessage = `Insufficient balance. You only have ${this.formatSats(this.feeBalance)} sats available.`;
      } else {
        this.statusMessage = 'Please enter a valid stake amount (min 1000 sats).';
      }
      this.statusType = 'error';
      this.clearStatusMessageAfterDelay();
    }
  }
  
  increaseStakeAmount(factor: number): void {
    const newAmount = this.stakeAmount * factor;
    
    if (newAmount <= this.feeBalance) {
      this.stakeAmount = newAmount;
    } else {
      this.stakeAmount = this.feeBalance;
    }
  }

  setMaxStake(): void {
    this.stakeAmount = this.feeBalance;
  }
  
  clearStatusMessageAfterDelay(delay: number = 5000): void {
    setTimeout(() => {
      this.statusMessage = '';
      this.statusType = '';
    }, delay);
  }

  // Formatting helpers
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
  
  formatUSD(value: number): string {
    if (value === undefined || value === null || isNaN(value) || value < 0) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
  
  formatUSDFromSats(sats: number): string {
    if (!this.btcPrice || sats <= 0) {
      return '$0.00';
    }
    const btcValue = sats / 100000000;
    return this.formatUSD(btcValue * this.btcPrice);
  }
}
