import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/wallet.service';
import { BlockConstellationContractService } from '../../../libs/block-constellation-contract.service';
import { sBTCTokenService } from '../../../libs/sbtc-token.service';
import { AllocateStatusService, AllocationTransaction } from '../../../shared/services/allocate-status.service';
import { TransactionInfoService } from '../../../libs/components/transaction-info/transaction-info.service';
import { Subscription } from 'rxjs';

// Interfaces
interface Constellation {
  id: number;
  name: string;
  meaning: string;
  totalStaked: number;
  yourStake: number;
  yourShare: number;
}

interface UserAllocation {
  totalStaked: number;
  constellationCount: number;
  allocations: { constellation: string; amount: number }[];
}

@Component({
  selector: 'app-game-current',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './game-current.component.html',
  styleUrl: './game-current.component.scss'
})
export class GameCurrentComponent implements OnInit, OnDestroy {
  // Wallet state
  walletConnected = false;
  feeBalance = 0;
  isLoadingBalance = false;
  
  // Epoch data
  currentEpoch = 0;  // Initialize to 0 instead of 42
  blocksRemaining = 0;  // Initialize to 0 instead of 97
  totalBlocks = 144;
  estimatedTimeRemaining = '';  // Initialize to empty string instead of mock value
  totalStakedPool = 0;  // Initialize to 0 instead of mock value
  
  // UI states
  isDrawerOpen = false;
  selectedConstellation: Constellation | null = null;
  stakeAmount = 1000;
  statusMessage = '';
  statusType = ''; // 'success' or 'error'
  showAllocationSummary = false;
  loadingPage = false;
  showNetworkMismatch = false;
  
  // Mock constellation data
  constellations: Constellation[] = [
    { id: 0, name: 'Aries', meaning: 'Courage, initiative, beginnings', totalStaked: 0.12345, yourStake: 0, yourShare: 0 },
    { id: 1, name: 'Taurus', meaning: 'Stability, sensuality, material grounding', totalStaked: 0.07865, yourStake: 0, yourShare: 0 },
    { id: 2, name: 'Gemini', meaning: 'Curiosity, communication, adaptability', totalStaked: 0.10524, yourStake: 0, yourShare: 0 },
    { id: 3, name: 'Cancer', meaning: 'Intuition, emotional depth, home', totalStaked: 0.05632, yourStake: 0, yourShare: 0 },
    { id: 4, name: 'Leo', meaning: 'Confidence, leadership, creative power', totalStaked: 0.13751, yourStake: 0, yourShare: 0 },
    { id: 5, name: 'Virgo', meaning: 'Precision, service, analysis', totalStaked: 0.04321, yourStake: 0, yourShare: 0 },
    { id: 6, name: 'Libra', meaning: 'Harmony, balance, relationships', totalStaked: 0.09876, yourStake: 0, yourShare: 0 },
    { id: 7, name: 'Scorpio', meaning: 'Transformation, intensity, mystery', totalStaked: 0.17654, yourStake: 0, yourShare: 0 },
    { id: 8, name: 'Sagittarius', meaning: 'Freedom, truth, expansion', totalStaked: 0.06789, yourStake: 0, yourShare: 0 },
    { id: 9, name: 'Capricorn', meaning: 'Ambition, discipline, mastery', totalStaked: 0.08765, yourStake: 0, yourShare: 0 },
    { id: 10, name: 'Aquarius', meaning: 'Innovation, rebellion, community', totalStaked: 0.12398, yourStake: 0, yourShare: 0 },
    { id: 11, name: 'Pisces', meaning: 'Compassion, dreams, spirituality', totalStaked: 0.11357, yourStake: 0, yourShare: 0 },
    { id: 12, name: 'Ophiuchus', meaning: 'Healing, knowledge, the mystical 13th sign', totalStaked: 0.09854, yourStake: 0, yourShare: 0 },
    { id: 13, name: 'Orion', meaning: 'The hunter, purpose, power of pursuit', totalStaked: 0.21987, yourStake: 0, yourShare: 0 },
    { id: 14, name: 'Andromeda', meaning: 'Grace, sacrifice, destiny', totalStaked: 0.08743, yourStake: 0, yourShare: 0 },
    { id: 15, name: 'Pegasus', meaning: 'Spiritual freedom, transcendence', totalStaked: 0.07651, yourStake: 0, yourShare: 0 },
    { id: 16, name: 'Cassiopeia', meaning: 'Beauty, pride, divine consequence', totalStaked: 0.10298, yourStake: 0, yourShare: 0 },
    { id: 17, name: 'Phoenix', meaning: 'Rebirth, transformation, rising from ashes', totalStaked: 0.16543, yourStake: 0, yourShare: 0 },
    { id: 18, name: 'Cygnus', meaning: 'Peace, purity, inner awakening', totalStaked: 0.06549, yourStake: 0, yourShare: 0 },
    { id: 19, name: 'Lyra', meaning: 'Harmony, resonance, cosmic music', totalStaked: 0.08761, yourStake: 0, yourShare: 0 },
    { id: 20, name: 'Draco', meaning: 'Shadow work, ancient wisdom', totalStaked: 0.11879, yourStake: 0, yourShare: 0 },
    { id: 21, name: 'Hydra', meaning: 'Challenges, perseverance, growth through struggle', totalStaked: 0.09871, yourStake: 0, yourShare: 0 },
    { id: 22, name: 'Crux', meaning: 'Faith, sacrifice, divine guidance', totalStaked: 0.07654, yourStake: 0, yourShare: 0 },
    { id: 23, name: 'Corona Borealis', meaning: 'Royal power, sovereignty, sacred feminine', totalStaked: 0.09912, yourStake: 0, yourShare: 0 }
  ];
  
  // User allocation summary
  userAllocation: UserAllocation = {
    totalStaked: 0,
    constellationCount: 0,
    allocations: []
  };
  
  // Service injections
  public walletService = inject(WalletService);
  public blockConstellationContractService = inject(BlockConstellationContractService);
  public sbtcTokenService = inject(sBTCTokenService);
  public allocateStatusService = inject(AllocateStatusService);
  public transactionInfoService = inject(TransactionInfoService);
  
  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Reset user allocation data to zero values (clear mock data)
  resetUserAllocationData(): void {
    // Reset the user allocation summary
    this.userAllocation = {
      totalStaked: 0,
      constellationCount: 0,
      allocations: []
    };
    
    // Reset each constellation's user stake and share
    this.constellations.forEach(constellation => {
      constellation.yourStake = 0;
      constellation.yourShare = 0;
    });
  }

  ngOnInit(): void {
    // Initialize component data
    this.loadingPage = true;
    
    // Reset user allocation data - don't show mock data
    this.resetUserAllocationData();
    
    // Check if wallet is connected
    this.walletConnected = this.walletService.isLoggedIn();
    
    if (this.walletConnected) {
      // When wallet is connected, fetch user-specific cycle data
      const userAddress = this.walletService.getSTXAddress();
      if (userAddress) {
        // Fetch the user's sBTC balance
        this.fetchUserBalance();
        
        // Get current cycle data including user allocations
        const cycleSubscription = this.blockConstellationContractService
          .getCurrentCycleUserStatus(userAddress)
          .subscribe({
            next: (cycleUserStatus) => {
              console.log('Current cycle user status:', cycleUserStatus);
              
              // Update cycle information - ensure it's a number
              this.currentEpoch = Number(cycleUserStatus.cycleId) || 0;
              
              // Update total staked pool (convert from satoshis to BTC)
              this.totalStakedPool = (cycleUserStatus.cyclePrize || 0) / 100000000;
              console.log('Total staked pool (BTC):', this.totalStakedPool);
              
              // Update constellation allocation data
              if (cycleUserStatus.cycleConstellationAllocation && 
                  Array.isArray(cycleUserStatus.cycleConstellationAllocation)) {
                this.updateConstellationAllocations(cycleUserStatus.cycleConstellationAllocation);
              }
              
              // Update user allocation data
              if (cycleUserStatus.userConstellationAllocation && 
                  Array.isArray(cycleUserStatus.userConstellationAllocation)) {
                this.updateUserAllocationData(cycleUserStatus.userConstellationAllocation);
              }
              
              // Calculate remaining time based on blockchain data
              this.calculateRemainingTimeFromBlockData(
                cycleUserStatus.cycleEndBlock,
                cycleUserStatus.blockchainTenureHeight
              );
              
              this.loadingPage = false;
            },
            error: (error) => {
              console.error('Error fetching current cycle user status:', error);
              this.loadingPage = false;
            }
          });
        
        this.subscriptions.push(cycleSubscription);
      } else {
        this.loadingPage = false;
      }
    } else {
      // When wallet is not connected, fetch only public cycle data
      const cycleSubscription = this.blockConstellationContractService
        .getCurrentCycle()
        .subscribe({
          next: (cycleData) => {
            console.log('Current cycle data:', cycleData);
            
            // Update cycle information - ensure it's a number
            this.currentEpoch = Number(cycleData.cycleId) || 0;
            
            // Update total staked pool (convert from satoshis to BTC)
            this.totalStakedPool = (cycleData.cyclePrize || 0) / 100000000;
            console.log('Total staked pool (BTC):', this.totalStakedPool);
            
            // Update constellation allocation data
            if (cycleData.cycleConstellationAllocation && 
                Array.isArray(cycleData.cycleConstellationAllocation)) {
              this.updateConstellationAllocations(cycleData.cycleConstellationAllocation);
            }
            
            // Calculate remaining time based on blockchain data
            this.calculateRemainingTimeFromBlockData(
              cycleData.cycleEndBlock,
              cycleData.blockchainTenureHeight
            );
            
            this.loadingPage = false;
          },
          error: (error) => {
            console.error('Error fetching current cycle data:', error);
            this.loadingPage = false;
          }
        });
      
      this.subscriptions.push(cycleSubscription);
    }
  }
  
  // Update user allocation data from blockchain
  updateUserAllocationData(allocations: number[]): void {
    console.log('Updating user allocation data with:', allocations);
    if (!allocations || !Array.isArray(allocations)) {
      console.error('Invalid user allocations data:', allocations);
      return;
    }
    
    // Reset allocation data first
    this.resetUserAllocationData();
    
    // Count constellations where the user has allocated tokens
    let count = 0;
    let totalStaked = 0;
    
    // Process the allocations
    for (let i = 0; i < allocations.length; i++) {
      // Ensure allocation is a valid number
      const allocation = Number(allocations[i]) || 0;
      
      if (allocation > 0) {
        count++;
        totalStaked += allocation;
        
        // Update the constellations array with user's stake
        // Note: Contract uses 0-based index, UI uses 0-based index too
        const constellationIndex = i;
        const constellationUiIndex = constellationIndex;
        
        if (constellationUiIndex < this.constellations.length) {
          this.constellations[constellationUiIndex].yourStake = allocation;
          
          // Calculate user's share percentage if the constellation has total stakes
          if (this.constellations[constellationUiIndex].totalStaked > 0) {
            const totalStakedSats = this.constellations[constellationUiIndex].totalStaked * 100000000;
            this.constellations[constellationUiIndex].yourShare = (allocation / totalStakedSats) * 100;
          } else {
            this.constellations[constellationUiIndex].yourShare = 0;
          }
          
          // Add to allocations list for the summary display
          this.userAllocation.allocations.push({
            constellation: this.constellations[constellationUiIndex].name,
            amount: allocation
          });
        }
      }
    }
    
    // Update the allocation summary
    this.userAllocation.totalStaked = totalStaked;
    this.userAllocation.constellationCount = count;
    
    console.log('Updated user allocation data:', this.userAllocation);
  }
  
  // Calculate the remaining time based on blockchain data
  calculateRemainingTimeFromBlockData(endBlock: number, currentBlockHeight: number): void {
    // Ensure we have valid numbers
    endBlock = Number(endBlock) || 0;
    currentBlockHeight = Number(currentBlockHeight) || 0;
    
    // Default to 144 blocks per cycle (typical Bitcoin blocks in a day)
    const blocksPerCycle = 144; 
    this.totalBlocks = blocksPerCycle;
    
    // Calculate the cycle start block
    const startBlock = endBlock - blocksPerCycle;
    
    // Calculate blocks remaining in this cycle
    this.blocksRemaining = Math.max(0, endBlock - currentBlockHeight);
    
    // Calculate blocks elapsed in this cycle
    const blocksElapsed = Math.max(0, currentBlockHeight - startBlock);
    
    // Ensure our calculations make sense
    if (blocksElapsed + this.blocksRemaining !== blocksPerCycle) {
      console.warn('Block calculation mismatch:', {
        blocksElapsed,
        blocksRemaining: this.blocksRemaining,
        blocksPerCycle,
        startBlock,
        endBlock,
        currentBlockHeight
      });
      
      // Adjust remaining blocks if necessary to ensure accurate progress bar
      if (currentBlockHeight >= endBlock) {
        // Cycle is complete
        this.blocksRemaining = 0;
      } else if (currentBlockHeight <= startBlock) {
        // Cycle hasn't started yet
        this.blocksRemaining = blocksPerCycle;
      }
    }
    
    // Calculate estimated time: assuming ~10 minutes per Bitcoin block
    const minutesRemaining = this.blocksRemaining * 10;
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = minutesRemaining % 60;
    
    this.estimatedTimeRemaining = `≈ ${hours}h ${minutes}m`;
    
    console.log('Blocks data:', {
      startBlock,
      endBlock,
      currentBlockHeight,
      blocksElapsed,
      blocksRemaining: this.blocksRemaining,
      totalBlocks: this.totalBlocks,
      progressPercentage: ((this.totalBlocks - this.blocksRemaining) / this.totalBlocks) * 100
    });
  }
  
  // Update constellation data with real allocation values from the blockchain
  updateConstellationAllocations(allocations: number[]): void {
    console.log('Updating constellation allocations with data:', allocations);
    if (!allocations || !Array.isArray(allocations)) {
      console.error('Invalid allocations data:', allocations);
      return;
    }
    
    // Make sure we don't exceed the number of constellations we have in our UI
    const maxLength = Math.min(allocations.length, this.constellations.length);
    
    let totalStakedSats = 0;
    
    for (let i = 0; i < maxLength; i++) {
      // Ensure allocation is a valid number
      const allocation = Number(allocations[i]) || 0;
      
      // Add to total for verification
      totalStakedSats += allocation;
      
      // Convert satoshis to BTC for display
      const btcAmount = allocation / 100000000;
      
      // Note: i is the contract's 0-based index, matches our array's 0-based index
      this.constellations[i].totalStaked = btcAmount;
    }
    
    // Log the total staked amount for debugging
    console.log('Total staked (from allocations, sats):', totalStakedSats);
    console.log('Total staked (from allocations, BTC):', totalStakedSats / 100000000);
    
    // Verify total stake against the total pool value
    const calculatedTotalBTC = totalStakedSats / 100000000;
    if (Math.abs(calculatedTotalBTC - this.totalStakedPool) > 0.00000001) {
      console.warn('Total stake calculation mismatch:', {
        calculated: calculatedTotalBTC,
        fromContract: this.totalStakedPool
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  toggleAllocationSummary(): void {
    this.showAllocationSummary = !this.showAllocationSummary;
  }

  selectConstellation(constellation: Constellation): void {
    if (!this.walletConnected) return;
    
    this.selectedConstellation = constellation;
    this.isDrawerOpen = true;
    
    // Reset stake amount to minimum or current balance (whichever is smaller)
    this.stakeAmount = this.feeBalance >= 1000 ? 1000 : Math.min(this.feeBalance, 1000);
    
    // Clear any previous status messages
    this.statusMessage = '';
    this.statusType = '';
    
    // Fetch the latest sBTC balance when opening the drawer
    this.fetchUserBalance();
  }

  closeStakeDrawer(): void {
    this.isDrawerOpen = false;
    setTimeout(() => {
      this.selectedConstellation = null;
      this.statusMessage = '';
      this.statusType = '';
    }, 300);
    
    // Fetch the latest sBTC balance when opening the drawer
    this.fetchUserBalance();
  }
  
  // Fetch the user's sBTC balance
  fetchUserBalance(): void {
    if (!this.walletConnected) return;
    
    this.isLoadingBalance = true;
    
    const balanceSubscription = this.sbtcTokenService.getBalance().subscribe({
      next: (balance) => {
        // Convert from bigint to number (safe for reasonable amounts)
        this.feeBalance = Number(balance);
        this.isLoadingBalance = false;
        
        // If current stakeAmount is greater than the available balance, adjust it
        if (this.stakeAmount > this.feeBalance) {
          this.stakeAmount = this.feeBalance > 1000 ? this.feeBalance : 1000;
        }
        
        console.log('User sBTC balance:', this.feeBalance);
      },
      error: (error) => {
        console.error('Error fetching sBTC balance:', error);
        this.isLoadingBalance = false;
        // Set a fallback balance if there's an error
        this.feeBalance = 0;
      }
    });
    
    this.subscriptions.push(balanceSubscription);
  }

  confirmStake(): void {
    if (!this.walletConnected) {
      this.statusMessage = 'Please connect your wallet first';
      this.statusType = 'error';
      this.clearStatusMessageAfterDelay();
      return;
    }
    
    // Fetch the latest balance before confirming stake
    this.isLoadingBalance = true;
    
    const balanceSubscription = this.sbtcTokenService.getBalance().subscribe({
      next: (balance) => {
        // Update the balance
        this.feeBalance = Number(balance);
        this.isLoadingBalance = false;
        
        // Check if stake amount is valid based on the latest balance
        if (this.selectedConstellation && this.stakeAmount >= 1000 && this.stakeAmount <= this.feeBalance) {
          // Reset any previous status messages
          this.statusMessage = 'Submitting your stake...';
          this.statusType = 'info';
          
          // Stake on the selected constellation via the contract
          this.blockConstellationContractService
            .allocate(this.stakeAmount, this.selectedConstellation.id)
            .subscribe({
              next: (response) => {
                console.log(`Staking transaction submitted: ${response.txid}`);
                
                // If we have a transaction ID, track it in the AllocateStatusService
                if (response.txid && this.selectedConstellation) {
                  this.allocateStatusService.addAllocationTransaction(
                    response.txid,
                    this.stakeAmount,
                    this.selectedConstellation.id
                  );
                  
                  // Note: We're not showing the transaction dialog anymore
                  // so the user can continue playing while the transaction is processed
                }
                
                // Set success status message
                const constellationName = this.selectedConstellation?.name || 'unknown';
                this.statusMessage = `Stake of ${this.formatSats(this.stakeAmount)} sats successfully submitted to the ${constellationName} constellation! Your transaction is now processing. Check the notifications panel for updates.`;
                this.statusType = 'success';
                
                // Clear message after 8 seconds (extended time for the user to read)
                this.clearStatusMessageAfterDelay(8000);
                
                // Refresh user data after a successful stake
                setTimeout(() => {
                  if (this.walletConnected) {
                    const userAddress = this.walletService.getSTXAddress();
                    if (userAddress) {
                      this.blockConstellationContractService
                        .getCurrentCycleUserStatus(userAddress)
                        .subscribe({
                          next: (cycleUserStatus) => {
                            this.currentEpoch = Number(cycleUserStatus.cycleId) || 0;
                            this.totalStakedPool = (cycleUserStatus.cyclePrize || 0) / 100000000;
                            
                            if (cycleUserStatus.cycleConstellationAllocation && 
                                Array.isArray(cycleUserStatus.cycleConstellationAllocation)) {
                              this.updateConstellationAllocations(cycleUserStatus.cycleConstellationAllocation);
                            }
                            
                            if (cycleUserStatus.userConstellationAllocation && 
                                Array.isArray(cycleUserStatus.userConstellationAllocation)) {
                              this.updateUserAllocationData(cycleUserStatus.userConstellationAllocation);
                            }
                            
                            this.calculateRemainingTimeFromBlockData(
                              cycleUserStatus.cycleEndBlock,
                              cycleUserStatus.blockchainTenureHeight
                            );
                          },
                          error: (error) => console.error('Error refreshing cycle data:', error)
                        });
                      
                      this.fetchUserBalance(); // Also refresh the balance
                    }
                  }
                }, 2000);
                
                // Close the drawer
                this.closeStakeDrawer();
              },
              error: (error) => {
                console.error('Error staking on constellation:', error);
                
                // Set error status message
                this.statusMessage = `Failed to stake on constellation: ${error.message || 'Unknown error'}`;
                this.statusType = 'error';
                
                // Clear message after 5 seconds
                this.clearStatusMessageAfterDelay();
              }
            });
        } else {
          // Insufficient balance or invalid stake amount
          if (this.feeBalance < 1000) {
            this.statusMessage = 'Insufficient sBTC balance. You need at least 1000 sats to stake.';
          } else if (this.stakeAmount > this.feeBalance) {
            this.statusMessage = `Insufficient balance. You only have ${this.formatSats(this.feeBalance)} sats available.`;
          } else {
            this.statusMessage = 'Please enter a valid stake amount (min 1000 sats).';
          }
          this.statusType = 'error';
          
          // Clear message after 5 seconds
          this.clearStatusMessageAfterDelay();
        }
      },
      error: (error) => {
        console.error('Error fetching sBTC balance:', error);
        this.isLoadingBalance = false;
        this.statusMessage = 'Could not verify your balance. Please try again.';
        this.statusType = 'error';
        this.clearStatusMessageAfterDelay();
      }
    });
    
    this.subscriptions.push(balanceSubscription);
  }
  
  clearStatusMessageAfterDelay(delay: number = 5000): void {
    setTimeout(() => {
      this.statusMessage = '';
      this.statusType = '';
    }, delay);
  }

  increaseStakeAmount(factor: number): void {
    // Multiply the current stake amount by the factor
    const newAmount = this.stakeAmount * factor;
    
    // Ensure the amount doesn't exceed the user's balance
    if (newAmount <= this.feeBalance) {
      this.stakeAmount = newAmount;
    } else {
      this.stakeAmount = this.feeBalance;
    }
  }

  setMaxStake(): void {
    this.stakeAmount = this.feeBalance;
  }

  formatSats(sats: number): string {
    // Handle NaN, undefined, null or negative values
    if (sats === undefined || sats === null || isNaN(sats) || sats < 0) {
      return '0';
    }
    return Math.floor(sats).toLocaleString();
  }

  formatBTC(btc: number): string {
    // Handle NaN, undefined, null or negative values
    if (btc === undefined || btc === null || isNaN(btc) || btc < 0) {
      return '0.00000000';
    }
    return btc.toFixed(8);
  }
  
  /**
   * Get all pending allocation transactions
   * @returns Array of pending allocation transactions
   */
  getPendingAllocations(): AllocationTransaction[] {
    return this.allocateStatusService.getPendingTransactions();
  }
  
  /**
   * Check if a constellation has a pending transaction
   * @param constellationId The constellation ID to check
   * @returns True if the constellation has a pending transaction
   */
  hasPendingTransaction(constellationId: number): boolean {
    const pendingTransactions = this.allocateStatusService.getPendingTransactions();
    return pendingTransactions.some(tx => tx.constellation === constellationId);
  }
}

// Removed the following methods after refactoring:
  // - fetchCycleData
  // - fetchUserAllocations
  // - calculateRemainingTime
  
  // These methods have been replaced with direct calls to
  // getCurrentCycleUserStatus when the wallet is connected
  // or getCurrentCycle when the wallet is not connected
