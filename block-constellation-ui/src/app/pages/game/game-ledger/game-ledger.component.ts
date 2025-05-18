import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/wallet.service';
import { BlockConstellationContractService } from '../../../libs/block-constellation-contract.service';
import { TransactionNotificationsComponent } from '../../../shared/components/transaction-notifications/transaction-notifications.component';
import { AllocateStatusService } from '../../../shared/services/allocate-status.service';
import { Subscription, forkJoin, of, switchMap, catchError, map, Observable } from 'rxjs';

// Interfaces for data models
interface EpochDetails {
  id: number;
  totalStakedPool: number;
  winningConstellation: number;
  winningConstellationName: string;
  userAllocations: UserAllocation[];
  userWinningAllocation: number;
  claimed: boolean;
  isCurrent: boolean;
}

interface UserAllocation {
  constellation: number;
  constellationName: string;
  amount: number;
  isWinner: boolean;
}

@Component({
  selector: 'app-game-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TransactionNotificationsComponent
  ],
  templateUrl: './game-ledger.component.html',
  styleUrl: './game-ledger.component.scss'
})
export class GameLedgerComponent implements OnInit, OnDestroy {
  // Service injections
  public walletService = inject(WalletService);
  public blockConstellationContractService = inject(BlockConstellationContractService);
  public allocateStatusService = inject(AllocateStatusService);
  
  // Component state
  walletConnected = false;
  loadingLedger = true;
  loadingPastEpoch = false;
  statusMessage = '';
  statusType = ''; // 'success', 'error', 'info'
  claimingReward = false;
  
  // Data for display
  currentEpochId = 0;
  selectedEpochId = 0;
  epochs: EpochDetails[] = [];
  selectedEpoch: EpochDetails | null = null;
  
  // Constellations map
  constellationsMap: Map<number, string> = new Map([
    [0, 'Aries'], [1, 'Taurus'], [2, 'Gemini'], [3, 'Cancer'], 
    [4, 'Leo'], [5, 'Virgo'], [6, 'Libra'], [7, 'Scorpio'],
    [8, 'Sagittarius'], [9, 'Capricorn'], [10, 'Aquarius'], [11, 'Pisces'], 
    [12, 'Ophiuchus'], [13, 'Orion'], [14, 'Andromeda'], [15, 'Pegasus'],
    [16, 'Cassiopeia'], [17, 'Phoenix'], [18, 'Cygnus'], [19, 'Lyra'],
    [20, 'Draco'], [21, 'Hydra'], [22, 'Crux'], [23, 'Corona Borealis']
  ]);
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  ngOnInit(): void {
    // Check if wallet is connected
    this.walletConnected = this.walletService.isLoggedIn();
    
    // Get current epoch ID
    if (this.walletConnected) {
      this.loadCurrentEpoch();
    } else {
      this.loadingLedger = false;
      this.statusMessage = 'Please connect your wallet to view the Star Ledger';
      this.statusType = 'info';
    }
  }
  
  /**
   * Load the current epoch data to determine which past epoch to display
   */
  loadCurrentEpoch(): void {
    const subscription = this.blockConstellationContractService.getCurrentCycleId()
      .pipe(
        switchMap((currentEpochId: number | bigint) => {
          console.log('Current Epoch ID:', currentEpochId);
          // Convert BigInt to number if needed
          this.currentEpochId = typeof currentEpochId === 'bigint' ? Number(currentEpochId) : currentEpochId;
          
          // Load the previous completed epoch (current - 1)
          const completedEpochId = Math.max(0, this.currentEpochId - 1);
          return this.loadEpochDetails(completedEpochId);
        }),
        catchError(error => {
          console.error('Error loading current epoch:', error);
          this.loadingLedger = false;
          this.statusMessage = 'Failed to load Star Ledger data';
          this.statusType = 'error';
          return of(null);
        })
      )
      .subscribe({
        next: (epoch: EpochDetails | null) => {
          if (epoch) {
            this.selectEpoch(epoch);
          }
          this.loadingLedger = false;
        },
        error: (error) => {
          console.error('Error in loadCurrentEpoch flow:', error);
          this.loadingLedger = false;
          this.statusMessage = 'Failed to load Star Ledger data';
          this.statusType = 'error';
        }
      });
    
    this.subscriptions.push(subscription);
  }
  
  /**
   * Load epoch details by ID
   * @param epochId The epoch ID to load
   * @returns Observable<EpochDetails | null>
   */
  loadEpochDetails(epochId: number): Observable<EpochDetails | null> {
    if (epochId < 0 || epochId >= this.currentEpochId) {
      return of(null);
    }
    
    this.loadingPastEpoch = true;
    
    // Check if we already have this epoch in our cache
    const cachedEpoch = this.epochs.find(e => e.id === epochId);
    if (cachedEpoch) {
      this.loadingPastEpoch = false;
      return of(cachedEpoch);
    }
    
    // Get cycle data and winning constellation in parallel
    return forkJoin({
      cycleData: this.blockConstellationContractService.getCycle(epochId),
      winningConstellation: this.blockConstellationContractService.getConstellation(epochId),
      userAllocations: this.walletConnected ? 
        this.blockConstellationContractService.getAllocatedByUser(
          epochId, 
          this.walletService.getSTXAddress()
        ) : of({ claimed: false, constellationAllocation: [] })
    }).pipe(
      map(({ cycleData, winningConstellation, userAllocations }) => {
        console.log(`Epoch ${epochId} data:`, { cycleData, winningConstellation, userAllocations });
        
        // Process user allocations
        const userAllocs: UserAllocation[] = [];
        let userWinningAllocation = 0;
        
        // Convert winningConstellation from BigInt to number if needed
        const winningConstellationNum = typeof winningConstellation === 'bigint' 
          ? Number(winningConstellation) 
          : winningConstellation;
        
        if (userAllocations && userAllocations.constellationAllocation) {
          userAllocations.constellationAllocation.forEach((amount, index) => {
            if (amount > 0) {
              // Convert amount from BigInt to number if needed
              const amountNum = typeof amount === 'bigint' ? Number(amount) : amount;
              const isWinner = index === winningConstellationNum;
              userAllocs.push({
                constellation: index,
                constellationName: this.getConstellationName(index),
                amount: amountNum,
                isWinner: isWinner
              });
              
              if (isWinner) {
                userWinningAllocation = amountNum;
              }
            }
          });
        }
        
        // Create epoch details object
        const epochDetails: EpochDetails = {
          id: epochId,
          totalStakedPool: typeof cycleData.prize === 'bigint' 
            ? Number(cycleData.prize) / 100000000 
            : cycleData.prize / 100000000, // Convert sats to BTC
          winningConstellation: winningConstellationNum,
          winningConstellationName: this.getConstellationName(winningConstellationNum),
          userAllocations: userAllocs,
          userWinningAllocation: userWinningAllocation,
          claimed: userAllocations.claimed,
          isCurrent: epochId === this.currentEpochId
        };
        
        // Add to our epochs cache
        this.epochs.push(epochDetails);
        this.loadingPastEpoch = false;
        
        return epochDetails;
      }),
      catchError(error => {
        console.error(`Error loading epoch ${epochId}:`, error);
        this.loadingPastEpoch = false;
        this.statusMessage = `Failed to load data for Epoch ${epochId}`;
        this.statusType = 'error';
        return of(null);
      })
    );
  }
  
  /**
   * Load a specific past epoch by ID
   * @param epochId The epoch ID to load
   */
  loadPastEpoch(epochId: number): void {
    if (epochId < 0 || epochId >= this.currentEpochId) {
      this.statusMessage = 'Invalid epoch selected';
      this.statusType = 'error';
      return;
    }

    this.loadingPastEpoch = true;
    
    const subscription = this.loadEpochDetails(epochId)
      .subscribe({
        next: (epoch: EpochDetails | null) => {
          if (epoch) {
            this.selectEpoch(epoch);
          }
          this.loadingPastEpoch = false;
        },
        error: (error) => {
          console.error(`Error loading epoch ${epochId}:`, error);
          this.loadingPastEpoch = false;
          this.statusMessage = `Failed to load data for Epoch ${epochId}`;
          this.statusType = 'error';
        }
      });
    
    this.subscriptions.push(subscription);
  }
  
  /**
   * Select an epoch to display
   * @param epoch The epoch details to display
   */
  selectEpoch(epoch: EpochDetails): void {
    this.selectedEpoch = epoch;
    this.selectedEpochId = epoch.id;
  }
  
  /**
   * Load the previous epoch
   */
  loadPreviousEpoch(): void {
    if (this.selectedEpochId > 0) {
      this.loadPastEpoch(this.selectedEpochId - 1);
    }
  }
  
  /**
   * Load the next epoch
   */
  loadNextEpoch(): void {
    if (this.selectedEpochId < this.currentEpochId - 1) {
      this.loadPastEpoch(this.selectedEpochId + 1);
    }
  }
  
  /**
   * Get constellation name by ID
   * @param id The constellation ID
   * @returns The constellation name
   */
  getConstellationName(id: number): string {
    return this.constellationsMap.get(id) || `Constellation ${id}`;
  }
  
  /**
   * Format BTC amount for display
   * @param btc BTC amount
   * @returns Formatted BTC amount
   */
  formatBTC(btc: number): string {
    return btc.toFixed(8);
  }
  
  /**
   * Format sats amount for display
   * @param sats Sats amount
   * @returns Formatted sats amount
   */
  formatSats(sats: number): string {
    return sats.toLocaleString();
  }
  
  /**
   * Claim reward for the selected epoch
   */
  claimReward(): void {
    if (!this.selectedEpoch || this.claimingReward) return;
    
    this.claimingReward = true;
    this.statusMessage = 'Claiming your Cosmic Bounty...';
    this.statusType = 'info';
    
    // Make sure the epochId is converted to number if needed
    const epochId = this.selectedEpoch.id;
    
    const subscription = this.blockConstellationContractService.claimReward(epochId)
      .subscribe({
        next: (response) => {
          console.log('Claim reward response:', response);
          if (response.txid) {
            this.statusMessage = 'Destiny aligned! Your reward has been sent.';
            this.statusType = 'success';
            // Mark as claimed in our local state
            if (this.selectedEpoch) {
              this.selectedEpoch.claimed = true;
            }
          } else if (response.error) {
            this.statusMessage = `Failed to claim reward: ${response.error}`;
            this.statusType = 'error';
          }
          this.claimingReward = false;
        },
        error: (error) => {
          console.error('Error claiming reward:', error);
          this.statusMessage = 'Failed to claim your Cosmic Bounty';
          this.statusType = 'error';
          this.claimingReward = false;
        }
      });
    
    this.subscriptions.push(subscription);
  }
  
  /**
   * Check if user can claim reward for the selected epoch
   * @returns True if user can claim reward
   */
  canClaimReward(): boolean {
    return this.walletConnected && 
           !!this.selectedEpoch && 
           !this.selectedEpoch.claimed && 
           this.selectedEpoch.userWinningAllocation > 0 &&
           !this.selectedEpoch.isCurrent;
  }
  
  /**
   * Clear status message after delay
   * @param delay Delay in milliseconds
   */
  clearStatusMessageAfterDelay(delay: number = 5000): void {
    setTimeout(() => {
      this.statusMessage = '';
      this.statusType = '';
    }, delay);
  }
  
  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
