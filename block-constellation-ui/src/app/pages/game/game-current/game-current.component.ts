import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../libs/services/wallet.service';
import { BlockConstellationContractService } from '../../../libs/services/block-constellation-contract.service';
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
  feeBalance = 15000;
  
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
  showAllocationSummary = false;
  loadingPage = false;
  showNetworkMismatch = false;
  
  // Mock constellation data
  constellations: Constellation[] = [
    { id: 1, name: 'Aries', meaning: 'Courage, initiative, beginnings', totalStaked: 0.12345, yourStake: 0, yourShare: 0 },
    { id: 2, name: 'Taurus', meaning: 'Stability, sensuality, material grounding', totalStaked: 0.07865, yourStake: 0, yourShare: 0 },
    { id: 3, name: 'Gemini', meaning: 'Curiosity, communication, adaptability', totalStaked: 0.10524, yourStake: 0, yourShare: 0 },
    { id: 4, name: 'Cancer', meaning: 'Intuition, emotional depth, home', totalStaked: 0.05632, yourStake: 0, yourShare: 0 },
    { id: 5, name: 'Leo', meaning: 'Confidence, leadership, creative power', totalStaked: 0.13751, yourStake: 0, yourShare: 0 },
    { id: 6, name: 'Virgo', meaning: 'Precision, service, analysis', totalStaked: 0.04321, yourStake: 0, yourShare: 0 },
    { id: 7, name: 'Libra', meaning: 'Harmony, balance, relationships', totalStaked: 0.09876, yourStake: 0, yourShare: 0 },
    { id: 8, name: 'Scorpio', meaning: 'Transformation, intensity, mystery', totalStaked: 0.17654, yourStake: 0, yourShare: 0 },
    { id: 9, name: 'Sagittarius', meaning: 'Freedom, truth, expansion', totalStaked: 0.06789, yourStake: 0, yourShare: 0 },
    { id: 10, name: 'Capricorn', meaning: 'Ambition, discipline, mastery', totalStaked: 0.08765, yourStake: 0, yourShare: 0 },
    { id: 11, name: 'Aquarius', meaning: 'Innovation, rebellion, community', totalStaked: 0.12398, yourStake: 0, yourShare: 0 },
    { id: 12, name: 'Pisces', meaning: 'Compassion, dreams, spirituality', totalStaked: 0.11357, yourStake: 0, yourShare: 0 },
    { id: 13, name: 'Ophiuchus', meaning: 'Healing, knowledge, the mystical 13th sign', totalStaked: 0.09854, yourStake: 0, yourShare: 0 },
    { id: 14, name: 'Orion', meaning: 'The hunter, purpose, power of pursuit', totalStaked: 0.21987, yourStake: 0, yourShare: 0 },
    { id: 15, name: 'Andromeda', meaning: 'Grace, sacrifice, destiny', totalStaked: 0.08743, yourStake: 0, yourShare: 0 },
    { id: 16, name: 'Pegasus', meaning: 'Spiritual freedom, transcendence', totalStaked: 0.07651, yourStake: 0, yourShare: 0 },
    { id: 17, name: 'Cassiopeia', meaning: 'Beauty, pride, divine consequence', totalStaked: 0.10298, yourStake: 0, yourShare: 0 },
    { id: 18, name: 'Phoenix', meaning: 'Rebirth, transformation, rising from ashes', totalStaked: 0.16543, yourStake: 0, yourShare: 0 },
    { id: 19, name: 'Cygnus', meaning: 'Peace, purity, inner awakening', totalStaked: 0.06549, yourStake: 0, yourShare: 0 },
    { id: 20, name: 'Lyra', meaning: 'Harmony, resonance, cosmic music', totalStaked: 0.08761, yourStake: 0, yourShare: 0 },
    { id: 21, name: 'Draco', meaning: 'Shadow work, ancient wisdom', totalStaked: 0.11879, yourStake: 0, yourShare: 0 },
    { id: 22, name: 'Hydra', meaning: 'Challenges, perseverance, growth through struggle', totalStaked: 0.09871, yourStake: 0, yourShare: 0 },
    { id: 23, name: 'Crux', meaning: 'Faith, sacrifice, divine guidance', totalStaked: 0.07654, yourStake: 0, yourShare: 0 },
    { id: 24, name: 'Corona Borealis', meaning: 'Royal power, sovereignty, sacred feminine', totalStaked: 0.09912, yourStake: 0, yourShare: 0 }
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
    
    // Get current epoch ID from blockchain
    if (this.walletConnected) {
      const cycleSubscription = this.blockConstellationContractService.getCurrentCycleId().subscribe({
        next: (cycleId: number) => {
          console.log('Current Cycle ID:', cycleId);
          this.currentEpoch = cycleId;
          
          // After getting the cycle ID, fetch the cycle data
          this.fetchCycleData(cycleId);
          
          // Also fetch user's allocations if they're logged in
          this.fetchUserAllocations(cycleId);
        },
        error: (error) => {
          console.error('Error fetching current cycle ID:', error);
          // Fallback to the mock data if there's an error
          this.loadingPage = false;
        }
      });
      
      this.subscriptions.push(cycleSubscription);
    } else {
      // Simulate loading time when no wallet connected
      setTimeout(() => {
        this.loadingPage = false;
      }, 1000);
    }
  }
  
  // Fetch user allocation data for the current cycle
  fetchUserAllocations(cycleId: number): void {
    if (!this.walletConnected) return;
    
    const userAddress = this.walletService.getSTXAddress();
    if (!userAddress) return;
    
    console.log(`Fetching allocation data for user ${userAddress} in cycle ${cycleId}`);
    
    const userAllocationSubscription = this.blockConstellationContractService
      .getAllocatedByUser(cycleId, userAddress)
      .subscribe({
        next: (allocationData) => {
          console.log('Received user allocation data:', allocationData);
          
          // Reset any previous mock data
          this.resetUserAllocationData();
          
          // Update UI with actual data from the blockchain if available
          if (allocationData && 
              allocationData.constellationAllocation && 
              Array.isArray(allocationData.constellationAllocation) && 
              allocationData.constellationAllocation.length > 0) {
            this.updateUserAllocationData(allocationData.constellationAllocation);
          } else {
            console.log('No user allocation data found or empty array - showing zero values');
          }
        },
        error: (error) => {
          console.error('Error fetching user allocation data:', error);
        }
      });
      
    this.subscriptions.push(userAllocationSubscription);
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
      const allocation = allocations[i] || 0;
      
      if (allocation > 0) {
        count++;
        totalStaked += allocation;
        
        // Update the constellations array with user's stake
        if (i < this.constellations.length) {
          this.constellations[i].yourStake = allocation;
          
          // Calculate user's share of this constellation
          if (this.constellations[i].totalStaked > 0) {
            const btcTotal = this.constellations[i].totalStaked;
            const satTotal = btcTotal * 100000000;
            this.constellations[i].yourShare = allocation / satTotal;
          }
          
          // Add to the allocations list
          this.userAllocation.allocations.push({
            constellation: this.constellations[i].name,
            amount: allocation
          });
        }
      }
    }
    
    // Update the summary data
    this.userAllocation.totalStaked = totalStaked;
    this.userAllocation.constellationCount = count;
    
    console.log('Updated user allocation:', this.userAllocation);
  }
  
  // Fetch cycle data including the prize pool
  fetchCycleData(cycleId: number): void {
    const cycleDataSubscription = this.blockConstellationContractService.getCycle(cycleId).subscribe({
      next: (cycleData) => {
        console.log('Received cycle data:', cycleData);
        
        // Convert prize from satoshis to BTC for display
        // Always update the totalStakedPool with the actual value from the contract,
        // even if it's zero, to ensure we don't show mock data
        this.totalStakedPool = (cycleData && typeof cycleData.prize === 'number') 
          ? cycleData.prize / 100000000 
          : 0;
        
        // Update constellation allocations from blockchain data if available
        if (cycleData && cycleData.constellationAllocation && Array.isArray(cycleData.constellationAllocation)) {
          // Update each constellation with real allocation data from the contract
          this.updateConstellationAllocations(cycleData.constellationAllocation);
        }
        
        // Calculate blocks remaining and estimated time
        this.calculateRemainingTime();
        
        this.loadingPage = false;
      },
      error: (error) => {
        console.error('Error fetching cycle data:', error);
        this.loadingPage = false;
      }
    });
    
    this.subscriptions.push(cycleDataSubscription);
  }
  
  // Calculate the remaining time in the current cycle
  calculateRemainingTime(): void {
    // In a real implementation, you'd get the current block height and calculate 
    // the blocks remaining until the next cycle
    // For now, we'll use the mock data
    
    // Calculate estimated time: assuming ~10 minutes per Bitcoin block
    const minutesRemaining = this.blocksRemaining * 10;
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = minutesRemaining % 60;
    
    this.estimatedTimeRemaining = `≈ ${hours}h ${minutes}m`;
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
    
    for (let i = 0; i < maxLength; i++) {
      // Ensure allocation is a valid number
      const allocation = allocations[i] || 0;
      
      // Convert satoshis to BTC for display
      const btcAmount = allocation / 100000000;
      this.constellations[i].totalStaked = btcAmount;
    }
    
    // Recalculate total staked pool
    let totalStaked = 0;
    allocations.forEach(allocation => {
      totalStaked += (allocation || 0);
    });
    
    // Always update the totalStakedPool - even if it's zero
    this.totalStakedPool = totalStaked / 100000000;
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  toggleAllocationSummary(): void {
    this.showAllocationSummary = !this.showAllocationSummary;
  }

  closeStakeDrawer(): void {
    this.isDrawerOpen = false;
    setTimeout(() => {
      this.selectedConstellation = null;
    }, 300);
  }

  selectConstellation(constellation: Constellation): void {
    this.selectedConstellation = constellation;
    this.isDrawerOpen = true;
  }

  confirmStake(): void {
    if (this.selectedConstellation && this.stakeAmount >= 1000 && this.stakeAmount <= this.feeBalance) {
      // Stake on the selected constellation via the contract
      this.blockConstellationContractService
        .allocate(this.stakeAmount, this.selectedConstellation.id)
        .subscribe({
          next: (response) => {
            console.log(`Staking transaction submitted: ${response.txid}`);
            // Close the drawer
            this.closeStakeDrawer();
            
            // Provide feedback to user that transaction is submitted
            // In a real app, you might want to show a success toast or message
          },
          error: (error) => {
            console.error('Error staking on constellation:', error);
            // Show error to user
          }
        });
    }
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
    return sats.toLocaleString();
  }

  formatBTC(btc: number): string {
    return btc.toFixed(8);
  }
}
