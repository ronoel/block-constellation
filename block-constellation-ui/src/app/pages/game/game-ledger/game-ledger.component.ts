import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/wallet.service';
import { BlockConstellationContractService } from '../../../libs/block-constellation-contract.service';
import { AllocateStatusService } from '../../../shared/services/allocate-status.service';
import { Subscription, forkJoin, of, switchMap, catchError, map, Observable, finalize, BehaviorSubject } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

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

interface StatusMessage {
  text: string;
  type: 'success' | 'error' | 'info' | 'warning' | '';
}

@Component({
  selector: 'app-game-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './game-ledger.component.html',
  styleUrl: './game-ledger.component.scss'
})
export class GameLedgerComponent implements OnInit, OnDestroy {
  // Service injections
  private walletService = inject(WalletService);
  private blockConstellationContractService = inject(BlockConstellationContractService);
  private allocateStatusService = inject(AllocateStatusService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  // Component state with BehaviorSubjects for better reactivity
  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$ = this.loadingSubject.asObservable();
  
  private statusSubject = new BehaviorSubject<StatusMessage>({ text: '', type: '' });
  status$ = this.statusSubject.asObservable();
  
  private claimingSubject = new BehaviorSubject<boolean>(false);
  claiming$ = this.claimingSubject.asObservable();
  
  // Component state - simple variables
  walletConnected = false;
  loadingLedger = true;
  loadingPastEpoch = false;
  
  get statusMessage(): string {
    return this.statusSubject.value.text;
  }
  
  get statusType(): string {
    return this.statusSubject.value.type;
  }
  
  get claimingReward(): boolean {
    return this.claimingSubject.value;
  }
  
  // Data for display
  currentEpochId = 0;
  selectedEpochId = 0;
  epochs: Map<number, EpochDetails> = new Map();
  selectedEpoch: EpochDetails | null = null;
  
  // Constellations map
  readonly constellationsMap: ReadonlyMap<number, string> = new Map([
    [0, 'Aries'], [1, 'Taurus'], [2, 'Gemini'], [3, 'Cancer'], 
    [4, 'Leo'], [5, 'Virgo'], [6, 'Libra'], [7, 'Scorpio'],
    [8, 'Sagittarius'], [9, 'Capricorn'], [10, 'Aquarius'], [11, 'Pisces'], 
    [12, 'Ophiuchus'], [13, 'Orion'], [14, 'Andromeda'], [15, 'Pegasus'],
    [16, 'Cassiopeia'], [17, 'Phoenix'], [18, 'Cygnus'], [19, 'Lyra'],
    [20, 'Draco'], [21, 'Hydra'], [22, 'Crux'], [23, 'Corona Borealis']
  ]);
  
  // Subscriptions
  private subscriptions = new Subscription();
  
  ngOnInit(): void {
    // Check if wallet is connected
    this.walletConnected = this.walletService.isLoggedIn();
    
    // Subscribe to route params to get the epoch ID
    this.subscriptions.add(
      this.route.paramMap.pipe(
        switchMap(params => {
          const epochIdParam = params.get('id');
          
          // Always get current epoch ID, regardless of wallet connection
          return this.blockConstellationContractService.getCurrentCycleId().pipe(
            map(currentEpochId => {
              this.currentEpochId = this.safeParseNumber(
                typeof currentEpochId === 'bigint' ? Number(currentEpochId) : currentEpochId
              );
              return { currentEpochId: this.currentEpochId, requestedEpochId: epochIdParam };
            }),
            catchError(error => {
              console.error('Error getting current cycle ID:', error);
              this.updateLoadingState(false);
              this.updateStatus('Failed to load Star Ledger data', 'error');
              return of({ currentEpochId: 0, requestedEpochId: null });
            })
          );
        }),
        switchMap(({ currentEpochId, requestedEpochId }) => {
          if (requestedEpochId) {
            // If we have an epoch ID in the URL, load that specific epoch
            const requestedId = parseInt(requestedEpochId, 10);
            
            // Validate the requested epoch ID
            if (!isNaN(requestedId) && requestedId >= 0 && requestedId < currentEpochId) {
              return this.loadEpochDetails(requestedId);
            } else {
              // If invalid epoch ID, redirect to the most recent completed epoch
              const validEpochId = Math.max(0, currentEpochId - 1);
              this.router.navigate(['/play/ledger', validEpochId]);
              return of(null);
            }
          } else {
            // No epoch ID in URL, load most recent completed epoch
            if (currentEpochId <= 0) {
              this.updateStatus('No previous epochs available yet', 'info');
              this.updateLoadingState(false);
              return of(null);
            }
            
            // Load the previous completed epoch (current - 1)
            const completedEpochId = Math.max(0, currentEpochId - 1);
            return this.loadEpochDetails(completedEpochId);
          }
        })
      ).subscribe({
        next: (epoch: EpochDetails | null) => {
          if (epoch) {
            this.selectEpoch(epoch);
          }
          this.updateLoadingState(false);
        },
        error: (error) => {
          console.error('Error in route subscription:', error);
          this.updateLoadingState(false);
          this.updateStatus('Failed to load Star Ledger data', 'error');
        }
      })
    );
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
    const cachedEpoch = this.epochs.get(epochId);
    if (cachedEpoch) {
      this.loadingPastEpoch = false;
      return of(cachedEpoch);
    }
    
    // Use appropriate method based on wallet connection status
    const cycleDataObservable: Observable<any> = this.walletConnected
      ? this.blockConstellationContractService.getCycleUserStatus(
          epochId,
          this.walletService.getSTXAddress()
        )
      : this.blockConstellationContractService.getCycleStatus(epochId);
    
    // Process the cycle data
    return cycleDataObservable.pipe(
      map(cycleData => this.processEpochData(epochId, cycleData)),
      catchError(error => {
        console.error(`Error loading epoch ${epochId}:`, error);
        this.loadingPastEpoch = false;
        this.updateStatus(`Failed to load data for Epoch ${epochId}`, 'error');
        return of(null);
      }),
      finalize(() => this.loadingPastEpoch = false)
    );
  }
  
  /**
   * Process epoch data from the blockchain
   * @param epochId - The epoch ID
   * @param cycleData - Raw data from the blockchain
   * @returns Processed EpochDetails object
   */
  private processEpochData(epochId: number, cycleData: any): EpochDetails {
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
    
    // Calculate reward details
    const { userRewardAmount, userAllocationPercentage } = this.calculateReward(
      userWinningAllocation,
      totalWinningConstellationStake,
      prizeInSats,
      prizeRemained,
      constellationAllocationRemained,
      cycleData.userClaimed === true,
      epochId
    );
    
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
      userAllocationPercentage: userAllocationPercentage
    };
    
    // Add the epoch to our cache using Map
    this.epochs.set(epochId, epochDetails);
    
    return epochDetails;
  }
  
  /**
   * Calculate user reward and allocation percentage
   */
  private calculateReward(
    userWinningAllocation: number,
    totalWinningConstellationStake: number,
    prizeInSats: number,
    prizeRemained: number,
    constellationAllocationRemained: number,
    isUserClaimed: boolean,
    epochId: number
  ): { userRewardAmount: number, userAllocationPercentage: number } {
    let userRewardAmount = 0;
    let userAllocationPercentage = 0;
    
    // First, check if we already have this epoch in cache with a reward amount (for claimed rewards)
    const cachedEpoch = this.epochs.get(epochId);
    
    if (cachedEpoch?.claimed && cachedEpoch?.userRewardAmount > 0) {
      // Use the cached values for claimed rewards to maintain the original amount
      return {
        userRewardAmount: cachedEpoch.userRewardAmount,
        userAllocationPercentage: cachedEpoch.userAllocationPercentage
      };
    } 
    
    if (userWinningAllocation > 0) {
      // Calculate user's percentage of the winning constellation
      userAllocationPercentage = totalWinningConstellationStake > 0 ? 
        (userWinningAllocation / totalWinningConstellationStake) * 100 : 0;
      
      if (isUserClaimed) {
        // When reward is claimed, estimate based on total prize and user percentage
        userRewardAmount = (prizeInSats * userWinningAllocation) / totalWinningConstellationStake;
      } else if (constellationAllocationRemained > 0) {
        // For unclaimed rewards, use the original formula
        userRewardAmount = (prizeRemained * userWinningAllocation) / constellationAllocationRemained;
        
        // Safety check to ensure we don't exceed available prize (same as in smart contract)
        userRewardAmount = Math.min(userRewardAmount, prizeRemained);
      }
      
      // Ensure we have a valid number
      userRewardAmount = isNaN(userRewardAmount) ? 0 : userRewardAmount;
    }
    
    return { userRewardAmount, userAllocationPercentage };
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
   * Update URL when changing epochs
   * @param epochId The epoch ID to navigate to
   */
  navigateToEpoch(epochId: number): void {
    this.router.navigate(['/play/ledger', epochId]);
  }
  
  /**
   * Load the previous epoch
   */
  loadPreviousEpoch(): void {
    if (this.selectedEpochId > 0) {
      this.navigateToEpoch(this.selectedEpochId - 1);
    }
  }
  
  /**
   * Load the next epoch
   */
  loadNextEpoch(): void {
    if (this.selectedEpochId < this.currentEpochId - 1) {
      this.navigateToEpoch(this.selectedEpochId + 1);
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
    return this.isValidNumber(btc) ? btc.toFixed(8) : '0.00000000';
  }
  
  /**
   * Format sats amount for display
   * @param sats Sats amount
   * @returns Formatted sats amount
   */
  formatSats(sats: number): string {
    return this.isValidNumber(sats) ? sats.toLocaleString() : '0';
  }
  
  /**
   * Format percentage for display
   * @param percentage Percentage value
   * @returns Formatted percentage with 2 decimal places
   */
  formatPercentage(percentage: number): string {
    return this.isValidNumber(percentage) ? percentage.toFixed(2) + '%' : '0.00%';
  }
  
  /**
   * Check if a value is a valid number
   */
  private isValidNumber(value: any): boolean {
    return value !== undefined && value !== null && !isNaN(value);
  }
  
  /**
   * Claim reward for the selected epoch
   */
  claimReward(): void {
    if (!this.selectedEpoch || this.claimingReward || !this.walletConnected) return;
    
    this.claimingSubject.next(true);
    this.updateStatus('Claiming your Cosmic Bounty...', 'info');
    
    // Make sure the epochId is converted to number if needed
    const epochId = this.selectedEpoch.id;
    
    // Store the current reward amount before claiming
    const claimedRewardAmount = this.selectedEpoch.userRewardAmount;
    const claimedAllocationPercentage = this.selectedEpoch.userAllocationPercentage;
    
    this.subscriptions.add(
      this.blockConstellationContractService.claimReward(epochId).pipe(
        finalize(() => this.claimingSubject.next(false))
      ).subscribe({
        next: (response) => {
          console.log('Claim reward response:', response);
          if (response.txid) {
            this.updateStatus('Destiny aligned! Your reward has been sent.', 'success');
            // Mark as claimed in our local state and preserve the reward amount
            if (this.selectedEpoch) {
              this.selectedEpoch.claimed = true;
              // Preserve the reward amount and allocation percentage after claiming
              this.selectedEpoch.userRewardAmount = this.isValidNumber(claimedRewardAmount) ? 
                claimedRewardAmount : 0;
              this.selectedEpoch.userAllocationPercentage = this.isValidNumber(claimedAllocationPercentage) ? 
                claimedAllocationPercentage : 0;
              
              // Update the cached epoch as well
              const cachedEpoch = this.epochs.get(epochId);
              if (cachedEpoch) {
                cachedEpoch.claimed = true;
                cachedEpoch.userRewardAmount = this.selectedEpoch.userRewardAmount;
                cachedEpoch.userAllocationPercentage = this.selectedEpoch.userAllocationPercentage;
                this.epochs.set(epochId, cachedEpoch);
              }
            }
          } else if (response.error) {
            this.updateStatus(`Failed to claim reward: ${response.error}`, 'error');
          }
        },
        error: (error) => {
          console.error('Error claiming reward:', error);
          this.updateStatus('Failed to claim your Cosmic Bounty', 'error');
        }
      })
    );
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
   * Update loading state
   */
  private updateLoadingState(isLoading: boolean): void {
    this.loadingLedger = isLoading;
    this.loadingSubject.next(isLoading);
  }
  
  /**
   * Update status message
   */
  private updateStatus(message: string, type: StatusMessage['type']): void {
    this.statusSubject.next({ text: message, type });
    
    // Automatically clear success and info messages after delay
    if (type === 'success' || type === 'info') {
      this.clearStatusMessageAfterDelay();
    }
  }
  
  /**
   * Clear status message after delay
   * @param delay Delay in milliseconds
   */
  private clearStatusMessageAfterDelay(delay: number = 5000): void {
    setTimeout(() => {
      this.statusSubject.next({ text: '', type: '' });
    }, delay);
  }
  
  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptions.unsubscribe();
  }
}
