import { Component, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/wallet.service';
import { BlockConstellationContractService } from '../../../libs/block-constellation-contract.service';
import { sBTCTokenService } from '../../../libs/sbtc-token.service';
import { AllocateStatusService, AllocationTransaction } from '../../../shared/services/allocate-status.service';
import { Subscription } from 'rxjs';
import { ConnectWalletComponent } from '../../../shared/components/connect-wallet/connect-wallet.component';

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
    FormsModule,
    ConnectWalletComponent
  ],
  templateUrl: './game-current.component.html',
  styleUrl: './game-current.component.scss'
})
export class GameCurrentComponent implements OnInit, OnDestroy {
  // Math utility for use in template
  Math = Math;
  
  // Wallet state
  walletConnected = false;
  feeBalance = 0;
  isLoadingBalance = false;
  
  // Epoch data
  currentEpoch = 0;
  blocksRemaining = 0;
  totalBlocks = 144;
  estimatedTimeRemaining = '';
  totalStakedPool = 0;
  
  // UI states
  isDrawerOpen = false;
  selectedConstellation: Constellation | null = null;
  stakeAmount = 1000;
  statusMessage = '';
  statusType = '';
  showAllocationSummary = false;
  loadingPage = false;
  
  // Constellation data
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
  
  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor() {
    this.loadingPage = true;
    

    effect(() => {
      if (this.walletService.isLoggedIn()) {
        this.walletConnected = true;
        this.resetUserAllocationData();
        this.loadUserData();
      } else {
        this.walletConnected = false;
        this.resetUserAllocationData(); // Reset user data when wallet is disconnected
        this.loadPublicData();
      }
    });
  }

  ngOnInit(): void {
  }
  
  // Load data when user is logged in
  private loadUserData(): void {
    const userAddress = this.walletService.getSTXAddress();
    if (userAddress) {
      this.fetchUserBalance();
      
      const cycleSubscription = this.blockConstellationContractService
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
            
            this.loadingPage = false;
          },
          error: (error) => {
            console.error('Error fetching current cycle user status:', error);
            this.resetUserAllocationData();
            // Fall back to public data on error
            this.loadPublicData();
          }
        });
      
      this.subscriptions.push(cycleSubscription);
    } else {
      // Reset user data when wallet address is not available
      this.resetUserAllocationData();
      this.loadingPage = false;
      // Load public data instead
      this.loadPublicData();
    }
  }
  
  // Load data when user is not logged in
  private loadPublicData(): void {
    // Make sure we reset user data when loading public data
    this.resetUserAllocationData();
    
    const cycleSubscription = this.blockConstellationContractService
      .getCurrentCycle()
      .subscribe({
        next: (cycleData) => {
          this.currentEpoch = Number(cycleData.cycleId) || 0;
          this.totalStakedPool = (cycleData.cyclePrize || 0) / 100000000;
          
          if (cycleData.cycleConstellationAllocation && 
              Array.isArray(cycleData.cycleConstellationAllocation)) {
            this.updateConstellationAllocations(cycleData.cycleConstellationAllocation);
          }
          
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

  // Reset user allocation data to zero values
  resetUserAllocationData(): void {
    this.userAllocation = {
      totalStaked: 0,
      constellationCount: 0,
      allocations: []
    };
    
    this.constellations.forEach(constellation => {
      constellation.yourStake = 0;
      constellation.yourShare = 0;
    });
  }
  
  // Update user allocation data from blockchain
  updateUserAllocationData(allocations: number[]): void {
    if (!allocations || !Array.isArray(allocations)) {
      console.error('Invalid user allocations data:', allocations);
      return;
    }
    
    this.resetUserAllocationData();
    
    let count = 0;
    let totalStaked = 0;
    
    for (let i = 0; i < allocations.length; i++) {
      const allocation = Number(allocations[i]) || 0;
      
      if (allocation > 0) {
        count++;
        totalStaked += allocation;
        
        const constellationIndex = i;
        
        if (constellationIndex < this.constellations.length) {
          this.constellations[constellationIndex].yourStake = allocation;
          
          if (this.constellations[constellationIndex].totalStaked > 0) {
            const totalStakedSats = this.constellations[constellationIndex].totalStaked * 100000000;
            // Calculate the percentage but cap it at 100%
            const share = (allocation / totalStakedSats) * 100;
            this.constellations[constellationIndex].yourShare = Math.min(share, 100);
          } else {
            this.constellations[constellationIndex].yourShare = 0;
          }
          
          this.userAllocation.allocations.push({
            constellation: this.constellations[constellationIndex].name,
            amount: allocation
          });
        }
      }
    }
    
    this.userAllocation.totalStaked = totalStaked;
    this.userAllocation.constellationCount = count;
  }
  
  // Calculate the remaining time based on blockchain data
  calculateRemainingTimeFromBlockData(endBlock: number, currentBlockHeight: number): void {
    endBlock = Number(endBlock) || 0;
    currentBlockHeight = Number(currentBlockHeight) || 0;
    
    const blocksPerCycle = 144; 
    this.totalBlocks = blocksPerCycle;
    
    const startBlock = endBlock - blocksPerCycle;
    this.blocksRemaining = Math.max(0, endBlock - currentBlockHeight);
    const blocksElapsed = Math.max(0, currentBlockHeight - startBlock);
    
    if (blocksElapsed + this.blocksRemaining !== blocksPerCycle) {
      if (currentBlockHeight >= endBlock) {
        this.blocksRemaining = 0;
      } else if (currentBlockHeight <= startBlock) {
        this.blocksRemaining = blocksPerCycle;
      }
    }
    
    const minutesRemaining = this.blocksRemaining * 10;
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = minutesRemaining % 60;
    
    this.estimatedTimeRemaining = `≈ ${hours}h ${minutes}m`;
  }
  
  // Update constellation data with real allocation values from the blockchain
  updateConstellationAllocations(allocations: number[]): void {
    if (!allocations || !Array.isArray(allocations)) {
      console.error('Invalid allocations data:', allocations);
      return;
    }
    
    const maxLength = Math.min(allocations.length, this.constellations.length);
    
    for (let i = 0; i < maxLength; i++) {
      const allocation = Number(allocations[i]) || 0;
      const btcAmount = allocation / 100000000;
      this.constellations[i].totalStaked = btcAmount;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  toggleAllocationSummary(): void {
    this.showAllocationSummary = !this.showAllocationSummary;
  }

  selectConstellation(constellation: Constellation): void {
    if (!this.walletConnected) return;
    
    this.selectedConstellation = constellation;
    this.isDrawerOpen = true;
    this.stakeAmount = this.feeBalance >= 1000 ? 1000 : Math.min(this.feeBalance, 1000);
    this.statusMessage = '';
    this.statusType = '';
    this.fetchUserBalance();
  }

  closeStakeDrawer(): void {
    this.isDrawerOpen = false;
    setTimeout(() => {
      this.selectedConstellation = null;
      this.statusMessage = '';
      this.statusType = '';
    }, 300);
    this.fetchUserBalance();
  }
  
  // Fetch the user's sBTC balance
  fetchUserBalance(): void {
    if (!this.walletConnected || !this.walletService.isLoggedIn()) {
      this.feeBalance = 0;
      this.isLoadingBalance = false;
      return;
    }
    
    this.isLoadingBalance = true;
    
    const balanceSubscription = this.sbtcTokenService.getBalance().subscribe({
      next: (balance) => {
        this.feeBalance = Number(balance);
        this.isLoadingBalance = false;
        
        if (this.stakeAmount > this.feeBalance) {
          this.stakeAmount = this.feeBalance > 1000 ? this.feeBalance : 1000;
        }
      },
      error: (error) => {
        console.error('Error fetching sBTC balance:', error);
        this.isLoadingBalance = false;
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
    
    this.isLoadingBalance = true;
    
    const balanceSubscription = this.sbtcTokenService.getBalance().subscribe({
      next: (balance) => {
        this.feeBalance = Number(balance);
        this.isLoadingBalance = false;
        
        if (this.selectedConstellation && this.stakeAmount >= 1000 && this.stakeAmount <= this.feeBalance) {
          this.statusMessage = 'Submitting your stake...';
          this.statusType = 'info';
          
          this.blockConstellationContractService
            .allocate(this.stakeAmount, this.selectedConstellation.id)
            .subscribe({
              next: (response) => {
                if (response.txid && this.selectedConstellation) {
                  this.allocateStatusService.addAllocationTransaction(
                    response.txid,
                    this.stakeAmount,
                    this.selectedConstellation.id
                  );
                }
                
                const constellationName = this.selectedConstellation?.name || 'unknown';
                this.statusMessage = `Stake of ${this.formatSats(this.stakeAmount)} sats successfully submitted to the ${constellationName} constellation! Your transaction is now processing. Check the notifications panel for updates.`;
                this.statusType = 'success';
                this.clearStatusMessageAfterDelay(8000);
                
                setTimeout(() => this.refreshUserData(), 2000);
                this.closeStakeDrawer();
              },
              error: (error) => {
                this.statusMessage = `Failed to stake on constellation: ${error.message || 'Unknown error'}`;
                this.statusType = 'error';
                this.clearStatusMessageAfterDelay();
              }
            });
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
  
  // Refresh user data after successful stake
  private refreshUserData(): void {
    if (this.walletConnected && this.walletService.isLoggedIn()) {
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
            error: (error) => {
              console.error('Error refreshing cycle data:', error);
              // Fall back to public data on error
              this.loadPublicData();
            }
          });
        
        this.fetchUserBalance();
      } else {
        this.loadPublicData();
      }
    } else {
      this.loadPublicData();
    }
  }
  
  clearStatusMessageAfterDelay(delay: number = 5000): void {
    setTimeout(() => {
      this.statusMessage = '';
      this.statusType = '';
    }, delay);
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
  
  // Check if wallet is actively connected and available
  private isWalletAvailable(): boolean {
    return this.walletConnected && this.walletService.isLoggedIn() && !!this.walletService.getSTXAddress();
  }
  
  hasPendingTransaction(constellationId: number): boolean {
    // Don't check for pending transactions if wallet is not connected
    if (!this.isWalletAvailable()) {
      return false;
    }
    
    const pendingTransactions = this.allocateStatusService.getPendingTransactions();
    return pendingTransactions.some(tx => tx.constellation === constellationId);
  }
  
  connectWallet(): void {
    this.walletService.signIn();
  }
}
