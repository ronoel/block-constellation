import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/wallet.service';
import { BlockConstellationContractService } from '../../../libs/block-constellation-contract.service';
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
  // New properties for reward calculation
  winningConstellationTotalStake: number;
  userRewardAmount: number;
  userAllocationPercentage: number;
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
    FormsModule
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
    this.loadingLedger = true;
    
    const subscription = this.blockConstellationContractService.getCurrentCycleId()
      .pipe(
        switchMap((currentEpochId: number | bigint) => {
          console.log('Current Epoch ID:', currentEpochId);
          // Convert BigInt to number if needed and ensure it's a valid number
          this.currentEpochId = typeof currentEpochId === 'bigint' 
            ? this.safeParseNumber(Number(currentEpochId)) 
            : this.safeParseNumber(currentEpochId);
          
          // No previous epochs if current is 0
          if (this.currentEpochId <= 0) {
            this.statusMessage = 'No previous epochs available yet';
            this.statusType = 'info';
            this.loadingLedger = false;
            return of(null);
          }
          
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
    
    // Use appropriate method based on wallet connection status
    let cycleDataObservable: Observable<any>;
    
    if (this.walletConnected) {
      // Use getCycleUserStatus when wallet is connected to get user-specific data
      cycleDataObservable = this.blockConstellationContractService.getCycleUserStatus(
        epochId,
        this.walletService.getSTXAddress()
      );
    } else {
      // Use getCycleStatus when wallet is not connected to get public data
      cycleDataObservable = this.blockConstellationContractService.getCycleStatus(epochId);
    }
    
    // Process the cycle data
    return cycleDataObservable.pipe(
      map((cycleData: any) => {
        console.log(`Epoch ${epochId} data:`, cycleData);
        
        // Process user allocations
        const userAllocs: UserAllocation[] = [];
        let userWinningAllocation = 0;
        
        // Get winning constellation from cycle data - ensure it's a valid number
        const winningConstellationNum = this.safeParseNumber(cycleData.cycleWinningConstellation);

        // Safely get array data with null checks
        const constellationAllocations = Array.isArray(cycleData.cycleConstellationAllocation) 
          ? cycleData.cycleConstellationAllocation 
          : [];
        
        // Get total staked in the winning constellation from the cycleConstellationAllocation array
        const totalWinningConstellationStake = 
          constellationAllocations[winningConstellationNum] 
            ? this.safeParseNumber(constellationAllocations[winningConstellationNum]) 
            : 0;
        
        // Get prize information with safe number conversion
        const prizeInSats = this.safeParseNumber(cycleData.cyclePrize);
        const prizeClaimed = this.safeParseNumber(cycleData.cyclePrizeClaimed);
        const allocationClaimed = this.safeParseNumber(cycleData.cycleAllocationClaimed);
        
        // Remaining prize and allocation
        const prizeRemained = Math.max(0, prizeInSats - prizeClaimed);
        const constellationAllocationRemained = Math.max(0, totalWinningConstellationStake - allocationClaimed);

        // Process user allocations if available (when wallet is connected)
        if (this.walletConnected && Array.isArray(cycleData.userConstellationAllocation)) {
          cycleData.userConstellationAllocation.forEach((amount: number, index: number) => {
            // Convert to number and check if greater than zero
            const numAmount = this.safeParseNumber(amount);
            if (numAmount > 0) {
              const isWinner = index === winningConstellationNum;
              userAllocs.push({
                constellation: index,
                constellationName: this.getConstellationName(index),
                amount: numAmount,
                isWinner: isWinner
              });
              
              if (isWinner) {
                userWinningAllocation = numAmount;
              }
            }
          });
        }
        
        // Calculate user reward based on the smart contract logic
        let userRewardAmount = 0;
        let userAllocationPercentage = 0;
        
        // First, check if we already have this epoch in cache with a reward amount (useful for claimed rewards)
        const cachedEpoch = this.epochs.find(e => e.id === epochId && e.claimed && e.userRewardAmount > 0);
        
        if (cachedEpoch) {
          // Use the cached values for claimed rewards to maintain the original amount
          userRewardAmount = cachedEpoch.userRewardAmount;
          userAllocationPercentage = cachedEpoch.userAllocationPercentage;
        } else if (userWinningAllocation > 0) {
          // Even if the reward is claimed, we want to show what it was
          // Calculate user's percentage of the winning constellation
          userAllocationPercentage = totalWinningConstellationStake > 0 ? 
            (userWinningAllocation / totalWinningConstellationStake) * 100 : 0;
          
          // For claimed rewards where we don't have the original amount,
          // we need to calculate an estimate based on the user's allocation percentage
          const userClaimedStatus = cycleData.userClaimed === true;
          
          if (userClaimedStatus) {
            // When reward is claimed, we estimate based on total prize and user percentage
            userRewardAmount = (prizeInSats * userWinningAllocation) / totalWinningConstellationStake;
          } else if (constellationAllocationRemained > 0) {
            // For unclaimed rewards, use the original formula
            userRewardAmount = (prizeRemained * userWinningAllocation) / constellationAllocationRemained;
            
            // Safety check to ensure we don't exceed available prize (same as in smart contract)
            userRewardAmount = userRewardAmount > prizeRemained ? prizeRemained : userRewardAmount;
          }
          
          // Ensure we have a valid number
          if (isNaN(userRewardAmount)) {
            userRewardAmount = 0;
          }
        }
        
        // Create epoch details object with safe number handling
        const epochDetails: EpochDetails = {
          id: epochId,
          totalStakedPool: prizeInSats > 0 ? prizeInSats / 100000000 : 0, // Convert sats to BTC safely
          winningConstellation: winningConstellationNum,
          winningConstellationName: this.getConstellationName(winningConstellationNum),
          userAllocations: userAllocs,
          userWinningAllocation: userWinningAllocation,
          claimed: cycleData.userClaimed === true,
          isCurrent: epochId === this.currentEpochId,
          // Add new properties with safe handling
          winningConstellationTotalStake: totalWinningConstellationStake,
          userRewardAmount: userRewardAmount,
          userAllocationPercentage: isNaN(userAllocationPercentage) ? 0 : userAllocationPercentage
        };
        
        // Add debug information about claim status and reward calculation
        console.log(`Epoch ${epochId} details:`, {
          rawClaimedValue: cycleData.userClaimed,
          epochDetailsClaimed: epochDetails.claimed,
          userWinningAllocation,
          totalWinningConstellationStake,
          userRewardAmount,
          userAllocationPercentage,
          calculationMethod: cycleData.userClaimed ? 'estimated from total prize' : 'calculated from remaining prize'
        });
        
        // Add to our epochs cache - replace existing entry if found
        const existingIndex = this.epochs.findIndex(e => e.id === epochId);
        if (existingIndex !== -1) {
          // If we already have this epoch in cache and it has a claim status and reward amount, 
          // keep those values to preserve claimed rewards
          if (this.epochs[existingIndex].claimed && this.epochs[existingIndex].userRewardAmount > 0) {
            epochDetails.claimed = true;
            epochDetails.userRewardAmount = this.epochs[existingIndex].userRewardAmount;
            epochDetails.userAllocationPercentage = this.epochs[existingIndex].userAllocationPercentage;
          }
          this.epochs[existingIndex] = epochDetails;
        } else {
          this.epochs.push(epochDetails);
        }
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
    if (btc === undefined || btc === null || isNaN(btc)) {
      return '0.00000000';
    }
    return btc.toFixed(8);
  }
  
  /**
   * Format sats amount for display
   * @param sats Sats amount
   * @returns Formatted sats amount
   */
  formatSats(sats: number): string {
    if (sats === undefined || sats === null || isNaN(sats)) {
      return '0';
    }
    return sats.toLocaleString();
  }
  
  /**
   * Format percentage for display
   * @param percentage Percentage value
   * @returns Formatted percentage with 2 decimal places
   */
  formatPercentage(percentage: number): string {
    if (percentage === undefined || percentage === null || isNaN(percentage)) {
      return '0.00%';
    }
    return percentage.toFixed(2) + '%';
  }
  
  /**
   * Claim reward for the selected epoch
   */
  claimReward(): void {
    if (!this.selectedEpoch || this.claimingReward || !this.walletConnected) return;
    
    this.claimingReward = true;
    this.statusMessage = 'Claiming your Cosmic Bounty...';
    this.statusType = 'info';
    
    // Make sure the epochId is converted to number if needed
    const epochId = this.selectedEpoch.id;
    
    // Store the current reward amount before claiming
    const claimedRewardAmount = this.selectedEpoch.userRewardAmount;
    const claimedAllocationPercentage = this.selectedEpoch.userAllocationPercentage;
    
    const subscription = this.blockConstellationContractService.claimReward(epochId)
      .subscribe({
        next: (response) => {
          console.log('Claim reward response:', response);
          if (response.txid) {
            this.statusMessage = 'Destiny aligned! Your reward has been sent.';
            this.statusType = 'success';
            // Mark as claimed in our local state and preserve the reward amount
            if (this.selectedEpoch) {
              this.selectedEpoch.claimed = true;
              
              // Preserve the reward amount and allocation percentage after claiming
              // Ensure we have valid numbers
              this.selectedEpoch.userRewardAmount = !isNaN(claimedRewardAmount) ? claimedRewardAmount : 0;
              this.selectedEpoch.userAllocationPercentage = !isNaN(claimedAllocationPercentage) ? claimedAllocationPercentage : 0;
              
              // Update the cached epoch as well to keep the data consistent
              const cachedEpochIndex = this.epochs.findIndex(e => e.id === epochId);
              if (cachedEpochIndex !== -1) {
                this.epochs[cachedEpochIndex].claimed = true;
                this.epochs[cachedEpochIndex].userRewardAmount = this.selectedEpoch.userRewardAmount;
                this.epochs[cachedEpochIndex].userAllocationPercentage = this.selectedEpoch.userAllocationPercentage;
              }
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
    const canClaim = this.walletConnected && 
           !!this.selectedEpoch && 
           !this.selectedEpoch.claimed && 
           this.selectedEpoch.userWinningAllocation > 0 &&
           !this.selectedEpoch.isCurrent;
    
    // Debug claim status
    if (this.selectedEpoch) {
      console.log('Can claim check:', {
        walletConnected: this.walletConnected,
        selectedEpoch: !!this.selectedEpoch,
        notClaimed: !this.selectedEpoch.claimed,
        claimedValue: this.selectedEpoch.claimed,
        hasWinningAllocation: this.selectedEpoch.userWinningAllocation > 0,
        notCurrent: !this.selectedEpoch.isCurrent,
        canClaim: canClaim
      });
    }
    
    return canClaim;
  }
  
  /**
   * Helper method to safely parse numbers from blockchain data
   * @param value The value to parse
   * @param defaultValue The default value to return if parsing fails
   * @returns The parsed number or default value
   */
  private safeParseNumber(value: any, defaultValue: number = 0): number {
    if (value === undefined || value === null) return defaultValue;
    
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
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
