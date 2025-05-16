import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Interfaces
interface Constellation {
  id: number;
  name: string;
  meaning: string;
  totalStaked: number; // in BTC
  yourStake: number; // in sats
  yourShare: number; // percentage
}

interface UserAllocation {
  totalStaked: number; // in sats
  constellationCount: number;
  allocations: { constellation: string; amount: number }[];
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit, OnDestroy {
  // Wallet state
  walletConnected = false;
  walletAddress = 'bc1q8c6c7ccst89np0plj9yys34s8p6kgn8dskavnx';
  networkType = 'Mainnet';
  feeBalance = 15000; // in sats
  
  // Epoch data
  currentEpoch = 42;
  blocksRemaining = 97;
  totalBlocks = 144;
  estimatedTimeRemaining = '≈ 16h 10m';
  totalStakedPool = 2.31875; // in BTC
  
  // UI states
  isDrawerOpen = false;
  selectedConstellation: Constellation | null = null;
  stakeAmount = 1000; // default minimum
  showAllocationSummary = false;
  loadingPage = false;
  showNetworkMismatch = false;
  
  // Mock constellation data
  constellations: Constellation[] = [
    { id: 1, name: 'Aries', meaning: 'Courage, initiative, beginnings', totalStaked: 0.12345, yourStake: 0, yourShare: 0 },
    { id: 2, name: 'Taurus', meaning: 'Stability, sensuality, material grounding', totalStaked: 0.07865, yourStake: 5000, yourShare: 0.635 },
    { id: 3, name: 'Gemini', meaning: 'Curiosity, communication, adaptability', totalStaked: 0.10524, yourStake: 0, yourShare: 0 },
    { id: 4, name: 'Cancer', meaning: 'Intuition, emotional depth, home', totalStaked: 0.05632, yourStake: 0, yourShare: 0 },
    { id: 5, name: 'Leo', meaning: 'Confidence, leadership, creative power', totalStaked: 0.13751, yourStake: 0, yourShare: 0 },
    { id: 6, name: 'Virgo', meaning: 'Precision, service, analysis', totalStaked: 0.04321, yourStake: 0, yourShare: 0 },
    { id: 7, name: 'Libra', meaning: 'Harmony, balance, relationships', totalStaked: 0.09876, yourStake: 0, yourShare: 0 },
    { id: 8, name: 'Scorpio', meaning: 'Transformation, intensity, mystery', totalStaked: 0.17654, yourStake: 8000, yourShare: 0.453 },
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
    { id: 23, name: 'Crux', meaning: 'Faith, sacrifice, divine guidance', totalStaked: 0.07654, yourStake: 2000, yourShare: 0.261 },
    { id: 24, name: 'Corona Borealis', meaning: 'Royal power, sovereignty, sacred feminine', totalStaked: 0.09912, yourStake: 0, yourShare: 0 },
    { id: 25, name: 'Delphinus', meaning: 'Joy, intuition, spiritual guidance', totalStaked: 0.05643, yourStake: 0, yourShare: 0 }
  ];
  
  // User allocation summary
  userAllocation: UserAllocation = {
    totalStaked: 15000, // in sats
    constellationCount: 3,
    allocations: [
      { constellation: 'Taurus', amount: 5000 },
      { constellation: 'Scorpio', amount: 8000 },
      { constellation: 'Crux', amount: 2000 }
    ]
  };
  
  private destroy$ = new Subject<void>();
  
  constructor() {}
  
  ngOnInit(): void {
    // Simulate loading
    this.loadingPage = true;
    setTimeout(() => {
      this.loadingPage = false;
      this.walletConnected = true; // Simulate connected wallet
    }, 1500);
    
    // Simulate block updates
    interval(20000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.blocksRemaining > 0) {
        this.blocksRemaining--;
        this.updateEstimatedTime();
      }
    });
    
    // Simulate pool updates
    interval(60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updatePoolData();
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  toggleWalletConnection(): void {
    this.walletConnected = !this.walletConnected;
    if (!this.walletConnected) {
      // Reset user data when disconnecting
      this.resetUserStakes();
    }
  }
  
  resetUserStakes(): void {
    this.constellations.forEach(constellation => {
      constellation.yourStake = 0;
      constellation.yourShare = 0;
    });
    
    this.userAllocation = {
      totalStaked: 0,
      constellationCount: 0,
      allocations: []
    };
  }
  
  openStakeDrawer(constellation: Constellation): void {
    if (!this.walletConnected || this.feeBalance < 1000) {
      return;
    }
    
    this.selectedConstellation = constellation;
    this.stakeAmount = 1000; // Reset to minimum
    this.isDrawerOpen = true;
  }
  
  closeStakeDrawer(): void {
    this.isDrawerOpen = false;
    this.selectedConstellation = null;
  }
  
  increaseStakeAmount(multiplier: number): void {
    if (multiplier === -1) { // MAX
      this.stakeAmount = this.feeBalance;
    } else {
      this.stakeAmount = Math.min(1000 * multiplier, this.feeBalance);
    }
  }
  
  confirmStake(): void {
    if (!this.selectedConstellation || this.stakeAmount < 1000 || this.stakeAmount > this.feeBalance) {
      return;
    }
    
    // Update constellation data
    const prevStake = this.selectedConstellation.yourStake;
    this.selectedConstellation.yourStake += this.stakeAmount;
    
    // Update share percentage
    const totalSats = this.selectedConstellation.totalStaked * 100000000;
    this.selectedConstellation.yourShare = +(this.selectedConstellation.yourStake / totalSats * 100).toFixed(3);
    
    // Update total pool
    this.totalStakedPool += this.stakeAmount / 100000000;
    
    // Update user allocation
    this.updateUserAllocation(this.selectedConstellation.name, this.stakeAmount);
    
    // Deduct from balance
    this.feeBalance -= this.stakeAmount;
    
    // Close drawer
    this.closeStakeDrawer();
    
    // Show toast (simulated)
    console.log(`Staked ${this.stakeAmount} sats on ${this.selectedConstellation.name}`);
  }
  
  updateUserAllocation(constellationName: string, amount: number): void {
    const existingAllocation = this.userAllocation.allocations.find(
      a => a.constellation === constellationName
    );
    
    if (existingAllocation) {
      existingAllocation.amount += amount;
    } else {
      this.userAllocation.allocations.push({
        constellation: constellationName,
        amount: amount
      });
      this.userAllocation.constellationCount++;
    }
    
    this.userAllocation.totalStaked += amount;
  }
  
  toggleAllocationSummary(): void {
    this.showAllocationSummary = !this.showAllocationSummary;
  }
  
  formatBTC(amount: number): string {
    return amount.toFixed(6);
  }
  
  formatSats(amount: number): string {
    return amount.toLocaleString();
  }
  
  updateEstimatedTime(): void {
    // In a real app, this would calculate based on actual block times
    const hoursRemaining = Math.floor(this.blocksRemaining / 6);
    const minutesRemaining = Math.floor((this.blocksRemaining % 6) * 10);
    this.estimatedTimeRemaining = `≈ ${hoursRemaining}h ${minutesRemaining}m`;
  }
  
  updatePoolData(): void {
    // In a real app, this would fetch from an API
    // Here we're just adding a random amount to simulate changes
    const randomChange = (Math.random() * 0.005) - 0.0025;
    this.totalStakedPool = Math.max(0, this.totalStakedPool + randomChange);
    
    // Update individual constellation stakes
    this.constellations.forEach(constellation => {
      const constellationChange = (Math.random() * 0.001) - 0.0005;
      constellation.totalStaked = Math.max(0.001, constellation.totalStaked + constellationChange);
      
      // Recalculate user share if they have a stake
      if (constellation.yourStake > 0) {
        const totalSats = constellation.totalStaked * 100000000;
        constellation.yourShare = +(constellation.yourStake / totalSats * 100).toFixed(3);
      }
    });
  }
}
